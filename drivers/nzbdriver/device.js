'use strict';

const Homey = require('homey');
const Api = require('../../lib/Api');

class NZBDevice extends Homey.Device {

  // Initialized
  async onInit() {
    this.log('Device is initiated');

    // Register capability listeners
    this.registerCapabilityListeners();

    // Create API object
    this.api = new Api(this.getData(), this.homey);

    // Sync device statistics
    await this.syncDevice();

    // Refresh timer
    this.setRefreshTimer(this.getSetting('refresh_interval'));
  }

  // Settings changed
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    changedKeys.forEach(name => {
      this.log(`Setting \`${name}\` set \`${oldSettings[name]}\` => \`${newSettings[name]}\``);

      if (name === 'refresh_interval') {
        this.setRefreshTimer(newSettings[name]);
      }
    });
  }

  // Deleted
  onDeleted() {
    this.homey.clearInterval(this._refreshTimer);

    this.log('Device is deleted');
  }

  // Pause download queue
  async pausedownload() {
    this.log('Pause download queue');

    try {
      await this.api.pausedownload();
      await this.setCapabilityValue('download_enabled', false);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // Set download speed limit
  async rate(args) {
    this.log(`Set download limit to ${args.download_rate} MB/s`);

    try {
      await this.api.rate(args.download_rate);
      await this.setCapabilityValue('rate_limit', args.download_rate);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // Reload server
  async reload() {
    this.log('Reload');

    try {
      await this.api.reload();
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // Resume download queue
  async resumedownload() {
    this.log('Resume download queue');

    try {
      await this.api.resumedownload();
      await this.setCapabilityValue('download_enabled', true);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // Scan incoming directory for nzb-files
  async scan() {
    this.log('Scan incoming directory for nzb-files');

    try {
      await this.api.scan();
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // Shutdown server
  async shutdown() {
    this.log('Shutdown');

    try {
      await this.api.shutdown();
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // Sync device data
  async syncDevice() {
    try {
      const status = await this.api.status();

      // Capability values
      await this.setCapabilityValue('article_cache', parseFloat(status.ArticleCacheMB));
      await this.setCapabilityValue('average_rate', parseFloat(status.AverageDownloadRate / 1024000));
      await this.setCapabilityValue('download_enabled', !status.DownloadPaused);
      await this.setCapabilityValue('download_rate', parseFloat(status.DownloadRate / 1024000));
      await this.setCapabilityValue('download_size', parseFloat(status.DownloadedSizeMB / 1024));
      await this.setCapabilityValue('download_time', this._toTime(Number(status.DownloadTimeSec)));
      await this.setCapabilityValue('free_disk_space', Math.floor(status.FreeDiskSpaceMB / 1024));
      await this.setCapabilityValue('rate_limit', Number(status.DownloadLimit / 1024000));
      await this.setCapabilityValue('remaining_size', Number(status.RemainingSizeMB));
      await this.setCapabilityValue('uptime', this._toTime(status.UpTimeSec));

      const files = await this.api.listfiles();

      await this.setCapabilityValue('remaining_files', Object.keys(files).length);

      if (!this.getAvailable()) {
        await this.setAvailable();
      }
    } catch (err) {
      await this.setUnavailable(err.message);
    }
  }

  // Register capability listeners
  registerCapabilityListeners() {
    this.registerCapabilityListener('download_enabled', async enabled => {
      if (enabled) {
        return this.resumedownload();
      }

      return this.pausedownload();
    });
  }

  // Refresh interval timer
  setRefreshTimer(seconds = 0) {
    if (this._refreshTimer) {
      this.homey.clearInterval(this._refreshTimer);

      this._refreshTimer = null;
    }

    if (seconds === 0) {
      this.log('Refresh timer stopped');

      return;
    }

    this._refreshTimer = this.homey.setInterval(async () => {
      await this.syncDevice();
    }, (seconds * 1000));

    this.log(`Refresh interval set to ${seconds} seconds`);
  }

  // Convert seconds to time
  _toTime(sec) {
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
