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
    this.unregisterTimer().catch(this.error);

    this.log('Deleted');
  }

  // Device initialized
  async onInit() {
    // Migrate settings
    await this.migrate();

    // Register capability listener
    this.registerCapabilityListener('download_enabled', this.onCapabilityDownloadEnabled.bind(this));

    // Register timer
    await this.registerTimer();

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
        await this.unregisterTimer();
        await this.registerTimer(newSettings[name]);
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

      this.error(msg);
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
  async registerTimer(seconds = null) {
    if (this.syncDeviceTimer) return;

    if (!seconds) {
      seconds = this.getSetting('refresh_interval');
    }

    this.syncDeviceTimer = this.homey.setInterval(this.sync.bind(this), (1000 * seconds));

    this.log('[Timer] Registered');
  }

  // Unregister timer
  async unregisterTimer() {
    if (!this.syncDeviceTimer) return;

    this.homey.clearInterval(this.syncDeviceTimer);

    this.syncDeviceTimer = null;

    this.log('[Timer] Unregistered');
  }

  /*
  | Support functions
  */

  // Migrate device
  async migrate() {
    if (this.getSetting('user') !== '-') return;

    let settings = this.getSettings();
    let { host } = settings;
    let client = new Client(settings);

    if (!host.startsWith('https://') && !host.startsWith('http://')) {
      settings.host = `https://${host}`;
      client.host = `https://${host}`;

      await client.call('version').catch(async () => {
        settings.host = `http://${host}`;
        client.host = `http://${host}`;

        await client.call('version').catch(async (err) => {
          settings.host = host;

          this.setUnavailable(this.homey.__(err.message)).catch(this.error);
        });
      });

      this.setSettings(settings).catch(this.error);
    }

    settings = null;
    client = null;
    host = null;

    this.log('Migrated');
  }

}

module.exports = Device;
