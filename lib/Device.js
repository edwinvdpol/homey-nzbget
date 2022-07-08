'use strict';

const Homey = require('homey');

class Device extends Homey.Device {

  /*
  | Device events
  */

  // Device added
  onAdded() {
    this.log('Device added');
  }

  // Device deleted
  onDeleted() {
    // Stop timer
    this.stopTimer().catch(this.error);

    // Remove event listeners
    this.removeEventListeners();

    this.log('Device deleted');
  }

  // Device initialized
  async onInit() {
    // Migrate settings
    this.migrate().catch(this.error);

    // Wait for driver to become ready
    await this.driver.ready();

    // Register listeners
    this.registerListeners();

    // Start timer
    this.startTimer().catch(this.error);

    this.log('Device initialized');

    // Synchronize device
    this.sync();
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

    await this.call('version', newSettings);
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

  // Synchronize device
  sync() {
    const device = this;

    this.homey.emit('sync', device);
  }

  /*
  | Listener functions
  */

  // Register listeners
  registerListeners() {
    this.registerCapabilityListener('download_enabled', this.onCapabilityDownloadEnabled.bind(this));
    this.registerEventListeners();
  }

  // Register event listeners
  registerEventListeners() {
    const {id} = this.getData();

    this.onSync = this.handleSyncData.bind(this);
    this.onError = this.setUnavailable.bind(this);

    this.homey.on(`error:${id}`, this.onError);
    this.homey.on(`sync:${id}`, this.onSync);

    this.log('Event listeners registered');
  }

  // Remove event listeners
  removeEventListeners() {
    const {id} = this.getData();

    this.homey.off(`error:${id}`, this.onError);
    this.homey.off(`sync:${id}`, this.onSync);

    this.onError = null;
    this.onSync = null;

    this.log('Event listeners removed');
  }

  /*
  | Timer functions
  */

  // Start timer
  async startTimer(seconds = null) {
    if (this._timer) {
      return;
    }

    if (!seconds) {
      seconds = this.getSetting('refresh_interval');
    }

    this._timer = this.homey.setInterval(this.sync.bind(this), (1000 * seconds));

    this.log(`Timer started with ${seconds} seconds`);
  }

  // Stop timer
  async stopTimer() {
    if (!this._timer) {
      return;
    }

    this.homey.clearTimeout(this._timer);
    this._timer = null;

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

  // Convert seconds to time
  toTime(sec) {
    const secNum = parseInt(sec, 10);
    let hours = Math.floor(secNum / 3600);
    let minutes = Math.floor((secNum - (hours * 3600)) / 60);
    let seconds = secNum - (hours * 3600) - (minutes * 60);

    if (hours < 10) {
      hours = `0${hours}`;
    }

    if (minutes < 10) {
      minutes = `0${minutes}`;
    }
    if (seconds < 10) {
      seconds = `0${seconds}`;
    }

    return `${hours}:${minutes}:${seconds}`;
  }

}

module.exports = Device;



