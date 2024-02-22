'use strict';

const Homey = require('homey');
const Client = require('./Client');

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
    // Unregister timer
    this.unregisterTimer();

    this.log('Deleted');
  }

  // Device initialized
  async onInit() {
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
      // Do not log password changes
      if (name === 'pass') {
        continue;
      }

      this.log(`Setting '${name}' is now '${newSettings[name]}'`);

      if (name === 'refresh_interval') {
        this.unregisterTimer();
        await new Promise((resolve) => setTimeout(resolve, 500));
        this.registerTimer(newSettings[name]);
      }
    }

    let client;

    try {
      client = new Client(newSettings);
      await client.call('version');
    } catch (err) {
      throw new Error(this.homey.__(err.message));
    } finally {
      client = null;

      this.log('[Settings] Updated');
    }
  }

  // Device destroyed
  async onUninit() {
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
      client = new Client(this.getSettings());
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

}

module.exports = Device;
