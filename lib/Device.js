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
        // Unregister timer
        this.unregisterTimer();

        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // Register timer
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

      this.setAvailable().catch(this.error);
    } catch (err) {
      const msg = this.homey.__(err.message);

      this.error('[Sync]', err.toString());
      this.setUnavailable(msg).catch(this.error);
    } finally {
      client = null;
      result = null;
    }
  }

  // Handle sync data
  handleSyncData(data) {
    if (blank(data)) return;

    this.log('Update device', JSON.stringify(data));

    if ('ArticleCacheMB' in data) {
      this.setCapabilityValue('article_cache', parseFloat(data.ArticleCacheMB)).catch(this.error);
    }

    if ('AverageDownloadRate' in data) {
      this.setCapabilityValue('average_rate', parseFloat(data.AverageDownloadRate / 1024000)).catch(this.error);
    }

    if ('DownloadPaused' in data) {
      this.setCapabilityValue('download_enabled', !data.DownloadPaused).catch(this.error);
    }

    if ('DownloadRate' in data) {
      this.setCapabilityValue('download_rate', parseFloat(data.DownloadRate / 1024000)).catch(this.error);
    }

    if ('DownloadedSizeMB' in data) {
      this.setCapabilityValue('download_size', parseFloat(data.DownloadedSizeMB / 1024)).catch(this.error);
    }

    if ('DownloadTimeSec' in data) {
      this.setCapabilityValue('download_time', this.toTime(Number(data.DownloadTimeSec))).catch(this.error);
    }

    if ('FreeDiskSpaceMB' in data) {
      this.setCapabilityValue('free_disk_space', Math.floor(data.FreeDiskSpaceMB / 1024)).catch(this.error);
    }

    if ('DownloadLimit' in data) {
      this.setCapabilityValue('rate_limit', Number(data.DownloadLimit / 1024000)).catch(this.error);
    }

    if ('RemainingSizeMB' in data) {
      this.setCapabilityValue('remaining_size', Number(data.RemainingSizeMB)).catch(this.error);
    }

    if ('UpTimeSec' in data) {
      this.setCapabilityValue('uptime', this.toTime(data.UpTimeSec)).catch(this.error);
    }

    this.setCapabilityValue('remaining_files', Object.keys(data.Files).length).catch(this.error);
  }

  /*
  | Capability events
  */

  // Download enabled capability changed
  async onCapabilityDownloadEnabled(value) {
    this.log(`User changed capability 'download_enabled' to '${value}'`);

    if (value) {
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
