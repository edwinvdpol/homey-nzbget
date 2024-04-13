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
    let result;

    try {
      this.log('[Sync] Get instance data');

      // Get API client
      client = new Client(this.getStore());
      result = await client.getSyncData();

      await this.handleSyncData(result);
    } catch (err) {
      const msg = this.homey.__(err.message);

      this.error('[Sync]', err.toString());
      this.setUnavailable(msg).catch(this.error);
    } finally {
      client = null;
      result = null;
    }
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
