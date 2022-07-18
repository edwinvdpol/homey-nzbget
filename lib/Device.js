'use strict';

const Homey = require('homey');
const Timer = require('./Timer');

class Device extends Homey.Device {

  /*
  | Device events
  */

  // Device added
  onAdded() {
    this.log('Added');
  }

  // Device deleted
  onDeleted() {
    // Stop timer
    this.timer.stop().catch(this.error);

    // Remove event listeners
    this.removeEventListeners().catch(this.error);

    this.log('Deleted');
  }

  // Device initialized
  async onInit() {
    // Migrate settings
    this.migrate().catch(this.error);

    // Register listeners
    await this.registerListeners();

    // Wait for driver to become ready
    await this.driver.ready();

    const device = this;

    // Register timer
    this.timer = new Timer({
      homey: this.homey,
      device: device
    });

    // Start timer
    await this.timer.start();

    this.log('Initialized');

    // Synchronize device
    this.homey.emit('sync', device);
  }

  // Settings changed
  async onSettings({oldSettings, newSettings, changedKeys}) {
    for (const name of changedKeys) {
      // Do not log password changes
      if (name === 'pass') {
        continue;
      }

      this.log(`Setting '${name}' set '${oldSettings[name]}' => '${newSettings[name]}'`);

      if (name === 'refresh_interval') {
        await this.timer.stop();
        await this.timer.start(newSettings[name]);
      }
    }

    await this.call('version', newSettings);
  }

  // Device destroyed
  async onUninit() {
    this.log('Destroyed');
  }

  /*
  | Synchronization functions
  */

  // Make API call
  async call(cmd, settings = null, params = []) {
    if (!settings) {
      settings = this.getSettings();
    }

    return this.homey.app.client.call(cmd, settings, params);
  }

  /*
  | Listener functions
  */

  // Register listeners
  async registerListeners() {
    // Register capability listeners
    this.registerCapabilityListener('download_enabled', this.onCapabilityDownloadEnabled.bind(this));

    // Register event listeners
    await this.registerEventListeners();
  }

  // Register event listeners
  async registerEventListeners() {
    const {id} = this.getData();

    this.onSync = this.handleSyncData.bind(this);
    this.onError = this.setUnavailable.bind(this);

    this.homey.on(`error:${id}`, this.onError);
    this.homey.on(`sync:${id}`, this.onSync);

    this.log('Event listeners registered');
  }

  // Remove event listeners
  async removeEventListeners() {
    const {id} = this.getData();

    this.homey.off(`error:${id}`, this.onError);
    this.homey.off(`sync:${id}`, this.onSync);

    this.onError = null;
    this.onSync = null;

    this.log('Event listeners removed');
  }

  /*
  | Support functions
  */

  // Migrate device
  async migrate() {
    if (this.getSetting('user') !== '-') {
      return;
    }

    this.log('Migrate settings');

    const cmd = 'version';
    const settings = this.getData();
    const {host} = settings;

    if (!settings.host.startsWith('https://') && !settings.host.startsWith('http://')) {
      settings.host = `https://${host}`;

      await this.call(cmd, settings).catch(async () => {
        settings.host = `http://${host}`;

        await this.call(cmd, settings).catch(async err => {
          settings.host = host;

          this.setUnavailable(err.message).catch(this.error);
        });
      });

      this.setSettings(settings).catch(this.error);
    }
  }

}

module.exports = Device;



