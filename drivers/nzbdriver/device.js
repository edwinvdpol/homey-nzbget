'use strict';

const Homey = require('homey');

class NZBDevice extends Homey.Device {

  /*
  |-----------------------------------------------------------------------------
  | Device events
  |-----------------------------------------------------------------------------
  */

  // Device initialized
  async onInit() {
    this.log('Device initialized');

    // Migrate to credentials in settings
    if (this.getSetting('user') === '-') {
      await this.migrateSettings();
    }

    // Register capability listeners
    await this.registerCapabilityListeners();

    // Sync device statistics
    await this.syncDevice();

    // Refresh timer
    this.setRefreshTimer(this.getSetting('refresh_interval')).catch(this.error);
  }

  // Device uninitialized
  async onUninit() {
    this.log('Device uninitialized');

    // Stop timer
    this.setRefreshTimer().catch(this.error);
  }

  // Settings changed
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    changedKeys.forEach(name => {
      // Do not log password changes
      if (name === 'pass') {
        return;
      }

      this.log(`Setting '${name}' set '${oldSettings[name]}' => '${newSettings[name]}'`);

      if (name === 'refresh_interval') {
        this.setRefreshTimer(newSettings[name]).catch(this.error);
      }
    });

    await this.homey.app.client.call('version', newSettings);
  }

  // Deleted
  onDeleted() {
    this.log('Device is deleted');

    this.setRefreshTimer().catch(this.error);
  }

  /*
  |-----------------------------------------------------------------------------
  | Device update functions
  |-----------------------------------------------------------------------------
  */

  // Pause download queue
  async pausedownload() {
    this.log('Pause download queue');

    await this.homey.app.client.call('pausedownload', this.getSettings());
    this.setCapabilityValue('download_enabled', false).catch(this.error);
  }

  // Request for file’s list of a group.
  async listfiles(id = 0) {
    if (id > 0) {
      return this.homey.app.client.call('listfiles', this.getSettings(), [0, 0, id]);
    } else {
      return this.homey.app.client.call('listfiles', this.getSettings());
    }
  }

  // Set download speed limit (mb/s)
  async rate(download_rate) {
    const limit = Number(download_rate * 1000);

    this.log(`Set download limit to ${limit} MB/s`);

    await this.homey.app.client.call('rate', this.getSettings(), [limit]);

    this.setCapabilityValue('rate_limit', limit).catch(this.error);
  }

  // Reload server
  async reload() {
    this.log('Reload');

    await this.homey.app.client.call('reload', this.getSettings());
  }

  // Resume download queue
  async resumedownload() {
    this.log('Resume download queue');

    await this.homey.app.client.call('resumedownload', this.getSettings());

    this.setCapabilityValue('download_enabled', true).catch(this.error);
  }

  // Scan incoming directory for nzb-files
  async scan() {
    this.log('Scan incoming directory for nzb-files');

    await this.homey.app.client.call('scan', this.getSettings());
  }

  // Shutdown server
  async shutdown() {
    this.log('Shutdown');

    await this.homey.app.client.call('shutdown', this.getSettings());
  }

  // Sync device data
  async syncDevice() {
    try {
      const settings = this.getSettings();
      const status = await this.homey.app.client.call('status', settings);

      // Capability values
      if (status.hasOwnProperty('ArticleCacheMB')) {
        this.setCapabilityValue('article_cache', parseFloat(status.ArticleCacheMB)).catch(this.error);
      }

      if (status.hasOwnProperty('AverageDownloadRate')) {
        this.setCapabilityValue('average_rate', parseFloat(status.AverageDownloadRate / 1024000)).catch(this.error);
      }

      if (status.hasOwnProperty('DownloadPaused')) {
        this.setCapabilityValue('download_enabled', !status.DownloadPaused).catch(this.error);
      }

      if (status.hasOwnProperty('DownloadRate')) {
        this.setCapabilityValue('download_rate', parseFloat(status.DownloadRate / 1024000)).catch(this.error);
      }

      if (status.hasOwnProperty('DownloadedSizeMB')) {
        this.setCapabilityValue('download_size', parseFloat(status.DownloadedSizeMB / 1024)).catch(this.error);
      }

      if (status.hasOwnProperty('DownloadTimeSec')) {
        this.setCapabilityValue('download_time', this.toTime(Number(status.DownloadTimeSec))).catch(this.error);
      }

      if (status.hasOwnProperty('FreeDiskSpaceMB')) {
        this.setCapabilityValue('free_disk_space', Math.floor(status.FreeDiskSpaceMB / 1024)).catch(this.error);
      }

      if (status.hasOwnProperty('DownloadLimit')) {
        this.setCapabilityValue('rate_limit', Number(status.DownloadLimit / 1024000)).catch(this.error);
      }

      if (status.hasOwnProperty('RemainingSizeMB')) {
        this.setCapabilityValue('remaining_size', Number(status.RemainingSizeMB)).catch(this.error);
      }

      if (status.hasOwnProperty('UpTimeSec')) {
        this.setCapabilityValue('uptime', this.toTime(status.UpTimeSec)).catch(this.error);
      }

      const files = await this.listfiles();

      this.setCapabilityValue('remaining_files', Object.keys(files).length).catch(this.error);

      if (!this.getAvailable()) {
        this.setAvailable().catch(this.error);
      }
    } catch (err) {
      this.error(err);
      this.setUnavailable(err.message).catch(this.error);
    }
  }

  // Migrate data to settings
  async migrateSettings() {
    const data = this.getData();
    const { host } = data;

    if (!data.host.startsWith('https://') && !data.host.startsWith('http://')) {
      data.host = `https://${host}`;

      await this.homey.app.client.call('version', data).catch(async () => {
        data.host = `http://${host}`;

        await this.homey.app.client.call('version', data).catch(async err => {
          data.host = host;

          await this.setSettings(data);

          this.setUnavailable(err.message).catch(this.error)
        });
      });

      this.setSettings(data).catch(this.error);
    }
  }

  /*
  |-----------------------------------------------------------------------------
  | Support functions
  |-----------------------------------------------------------------------------
  */

  // Register capability listeners
  async registerCapabilityListeners() {
    this.registerCapabilityListener('download_enabled', async (enabled) => {
      if (enabled) {
        await this.resumedownload();
      } else {
        await this.pausedownload();
      }
    });
  }

  // Refresh interval timer
  async setRefreshTimer(seconds = 0) {
    if (this.refreshTimer) {
      this.homey.clearInterval(this.refreshTimer);

      this.refreshTimer = null;
    }

    if (seconds === 0) {
      this.log('Refresh timer stopped');

      return;
    }

    this.refreshTimer = this.homey.setInterval(async () => {
      await this.syncDevice();
    }, (seconds * 1000));

    this.log(`Refresh interval set to ${seconds} seconds`);
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

module.exports = NZBDevice;
