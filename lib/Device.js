'use strict';

const Homey = require('homey');
const Client = require('./Client');

class Device extends Homey.Device {

  /*
  | Device events
  */

  // Device deleted
  onDeleted() {
    // Stop timer
    this.stopTimer().catch(this.error);

    this.log('Deleted');
  }

  // Device initialized
  async onInit() {
    // Migrate settings
    await this.migrate();

    // Wait for driver to become ready
    await this.driver.ready();

    // Register capability listener
    this.registerCapabilityListener('download_enabled', this.onCapabilityDownloadEnabled.bind(this));

    // Start timer
    await this.startTimer();

    this.log('Initialized');

    // Synchronize device
    await this.sync();
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
        await this.stopTimer();
        await this.startTimer(newSettings[name]);
      }
    }

    try {
      const client = new Client(newSettings);
      await client.call('version');
    } catch (err) {
      throw new Error(this.homey.__(err.message));
    }
  }

  // Device destroyed
  async onUninit() {
    // Stop timer
    this.stopTimer().catch(this.error);

    this.log('Destroyed');
  }

  /*
  | Synchronization function
  */

  async sync() {
    try {
      // Get API client
      const client = new Client(this.getSettings());
      const data = await client.getSyncData();

      await this.handleSyncData(data);
    } catch (err) {
      const msg = this.homey.__(err.message);

      this.error(msg);
      this.setUnavailable(msg).catch(this.error);
    }
  }

  /*
  | Timer functions
  */

  // Start timer
  async startTimer(seconds = null) {
    if (this.timer) {
      return;
    }

    if (!seconds) {
      seconds = this.getSetting('refresh_interval');
    }

    this.timer = this.homey.setInterval(this.sync.bind(this), (1000 * seconds));

    this.log(`Started with ${seconds} seconds`);
  }

  // Stop timer
  async stopTimer() {
    if (!this.timer) {
      return;
    }

    this.homey.clearTimeout(this.timer);
    this.timer = null;

    this.log('Timer stopped');
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

    const settings = this.getSettings();
    const {host} = settings;

    let client = new Client(settings);

    if (!host.startsWith('https://') && !host.startsWith('http://')) {
      settings.host = `https://${host}`;
      client.host = `https://${host}`;

      await client.call('version').catch(async () => {
        settings.host = `http://${host}`;
        client.host = `http://${host}`;

        await client.call('version').catch(async err => {
          settings.host = host;

          this.setUnavailable(this.homey.__(err.message)).catch(this.error);
        });
      });

      this.setSettings(settings).catch(this.error);
    }
  }

}

module.exports = Device;



