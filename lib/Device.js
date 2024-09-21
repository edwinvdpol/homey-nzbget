'use strict';

const Homey = require('homey');
const Client = require('./Client');
const { blank } = require('./Utils');

class Device extends Homey.Device {

  /*
  | Device events
  */

  // Device added
  async onAdded() {
    this.log('Added');
  }

  // Device deleted
  async onDeleted() {
    this.log('Deleted');
  }

  // Device initialized
  async onInit() {
    // Connecting to API
    await this.setUnavailable(this.homey.__('authentication.connecting'));

    // Migrate settings to store
    await this.migrate();

    // Register capability listener
    this.registerCapabilityListener('download_enabled', this.onCapabilityDownloadEnabled.bind(this));

    // Register timer
    this.registerTimer();

    // Synchronize device
    await this.sync();

    this.log('Initialized');
  }

  // Device settings changed
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[Settings] Updating');

    for (const name of changedKeys) {
      const newValue = newSettings[name];

      this.log(`[Settings] '${name}' is now '${newValue}'`);

      // Refresh interval
      if (name === 'refresh_interval') {
        this.unregisterTimer();
        await new Promise((resolve) => setTimeout(resolve, 500));
        this.registerTimer(newValue);
      }
    }

    this.log('[Settings] Updated');
  }

  // Device destroyed
  async onUninit() {
    // Unregister timer
    this.unregisterTimer();

    this.log('Destroyed');
  }

  /*
  | Synchronization function
  */

  // Synchronize
  async sync() {
    let client;
    let server;

    try {
      this.log('[Sync] Get device data');

      // Get API client
      client = new Client(this.getStore());
      server = await client.getServer();

      this.log('[Sync]', JSON.stringify(server));

      // Update capabilities
      for (const [key, value] of Object.entries(server.capabilityValues)) {
        this.setCapabilityValue(key, value).catch(this.error);
      }

      this.setAvailable().catch(this.error);
    } catch (err) {
      const msg = this.homey.__(err.message);

      this.error('[Sync]', err.toString());
      this.setUnavailable(msg).catch(this.error);
    } finally {
      client = null;
      server = null;
    }
  }

  /*
  | Capability events
  */

  // Download enabled capability changed
  async onCapabilityDownloadEnabled(enabled) {
    if (enabled) {
      await this.resumedownload();

      return;
    }

    await this.pausedownload();
  }

  /*
  | Device actions
  */

  // Pause download queue
  async pausedownload() {
    this.log('Pause download queue');

    await this.call('pausedownload');

    this.setCapabilityValue('download_enabled', false).catch(this.error);
  }

  // Set download speed limit (mb/s)
  async rate(downloadRate) {
    const limit = Number(downloadRate * 1000);

    this.log(`Set download limit to ${limit} MB/s`);

    await this.call('rate', [limit]);

    this.setCapabilityValue('rate_limit', limit).catch(this.error);
  }

  // Reload server
  async reload() {
    this.log('Reload');

    await this.call('reload');

    let device = this;

    // Trigger program reloaded flow card
    await this.driver.ready();
    await this.homey.reloadedTrigger.trigger(device);

    device = null;
  }

  // Resume download queue
  async resumedownload() {
    this.log('Resume download queue');

    await this.call('resumedownload');

    this.setCapabilityValue('download_enabled', true).catch(this.error);
  }

  // Scan incoming directory for nzb-files
  async scan() {
    this.log('Scan incoming directory for nzb-files');

    await this.call('scan');
  }

  // Shutdown server
  async shutdown() {
    this.log('Shutdown');

    await this.call('shutdown');

    let device = this;

    // Trigger program shutdown flow card
    await this.driver.ready();
    await this.homey.shutdownTrigger.trigger(device);

    device = null;
  }

  /*
  | Timer functions
  */

  // Register timer
  registerTimer(seconds = null) {
    if (this.syncDeviceTimer) return;

    if (!seconds) {
      seconds = this.getSetting('refresh_interval');
    }

    this.syncDeviceTimer = this.homey.setInterval(this.sync.bind(this), (1000 * seconds));

    this.log('[Timer] Registered');
  }

  // Unregister timer
  unregisterTimer() {
    if (!this.syncDeviceTimer) return;

    this.homey.clearInterval(this.syncDeviceTimer);

    this.syncDeviceTimer = null;

    this.log('[Timer] Unregistered');
  }

  /*
  | Support functions
  */

  async call(cmd, params = []) {
    let client;

    try {
      client = new Client(this.getStore());

      return client.call(cmd, params);
    } catch (err) {
      this.error('[Call]', err.toString());
      throw new Error(this.homey.__(err.message));
    } finally {
      client = null;
    }
  }

  async setStoreValues(values) {
    if (blank(values)) return;

    for (const [key, value] of Object.entries(values)) {
      await this.setStoreValue(key, value);
    }

    this.log('[Store] Values updated');
  }

  async migrate() {
    let current = this.getSettings();

    // Already migrated
    if (!('host' in current)) return;
    if (blank(current.host)) return;

    // Migrate
    this.log('[Migrate] Started');

    let settings = {};
    let store = {};

    for (const [key, value] of Object.entries(current)) {
      if (key === 'refresh_interval' || key === 'energy_value_constant') continue;

      store[key] = value;
      settings[key] = null;
    }

    this.setSettings(settings).catch(this.error);
    await this.setStoreValues(store);

    current = null;
    settings = null;
    store = null;

    this.log('[Migrate] Finished');
  }

}

module.exports = Device;
