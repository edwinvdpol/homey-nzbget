'use strict';

const Homey = require('homey');
const Api = require('/lib/Api.js');

class NZBDevice extends Homey.Device {

  /*
  |---------------------------------------------------------------------------
  | Initiate
  |---------------------------------------------------------------------------
  |
  | This method is called when a device is initiated.
  |
  */

  async onInit() {
    try {
      this.log('Device is initiated');

      // Register capability listeners
      this._registerCapabilityListeners();

      // Create API object
      this.api = new Api(this.getData());

      // Update device statistics on startup
      await this._updateDevice();

      // Refresh timer
      this._setRefreshTimer(this.getSetting('refresh_interval'));
    } catch (err) {
      await this.setUnavailable(err.message);
    }
  }

  /*
  |---------------------------------------------------------------------------
  | Settings changed
  |---------------------------------------------------------------------------
  |
  | This method is called when the device settings are changed.
  | It logs all the changed keys, including the old- and new value.
  |
  | When the update interval has been changed, it will update the timer.
  |
  */

  onSettings(oldSettings, newSettings, changedKeys, callback) {
    changedKeys.forEach((name) => {
      this.log(`Setting \`${name}\` set \`${oldSettings[name]}\` => \`${newSettings[name]}\``);

      if (name === 'refresh_interval') {
        this._setRefreshTimer(newSettings[name]);
      }
    });

    callback(null, null);
  }

  /*
  |---------------------------------------------------------------------------
  | Deleted
  |---------------------------------------------------------------------------
  |
  | This method is called when a device is deleted.
  |
  */

  onDeleted() {
    this.homey.clearInterval(this._refreshTimer);

    this.log('Device is deleted');
  }

  /*
  |---------------------------------------------------------------------------
  | API functions
  |---------------------------------------------------------------------------
  |
  | These functions are supported by the device.
  |
  */

  // Pause download queue
  async pausedownload() {
    this.log('Pause download queue');

    await this.api.pausedownload();
    await this.setCapabilityValue('download_enabled', false);
  }

  // Set download speed limit
  async rate(args) {
    this.log(`Set download limit to ${args.download_rate} MB/s`);

    await this.api.rate(args.download_rate);
    await this.setCapabilityValue('rate_limit', args.download_rate);
  }

  // Reload server
  async reload() {
    this.log('Reload');

    await this.api.reload();
  }

  // Resume download queue
  async resumedownload() {
    this.log('Resume download queue');

    await this.api.resumedownload();
    await this.setCapabilityValue('download_enabled', true);
  }

  // Scan incoming directory for nzb-files
  async scan() {
    this.log('Scan incoming directory for nzb-files');

    await this.api.scan();
  }

  // Shutdown server
  async shutdown() {
    this.log('Shutdown');

    await this.api.shutdown();
  }

  /*
  |---------------------------------------------------------------------------
  | Update device
  |---------------------------------------------------------------------------
  |
  | This method is periodically called to update the device.
  |
  */

  async _updateDevice() {
    try {
      const status = await this.api.status();

      // Convert data
      const average_rate = parseFloat(status.AverageDownloadRate / 1024000);
      const download_enabled = (!status.DownloadPaused);
      const download_rate = parseFloat(status.DownloadRate / 1024000);
      const download_size = parseFloat(status.DownloadedSizeMB / 1024);
      const free_disk_space = Math.floor(status.FreeDiskSpaceMB / 1024);
      const rate_limit = Number(status.DownloadLimit / 1024000);

      // Capability values
      await this.setCapabilityValue('article_cache', parseFloat(status.ArticleCacheMB));
      await this.setCapabilityValue('average_rate', average_rate);
      await this.setCapabilityValue('download_enabled', download_enabled);
      await this.setCapabilityValue('download_rate', download_rate);
      await this.setCapabilityValue('download_size', download_size);
      await this.setCapabilityValue('download_time', this._toTime(Number(status.DownloadTimeSec)));
      await this.setCapabilityValue('free_disk_space', free_disk_space);
      await this.setCapabilityValue('rate_limit', rate_limit);
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

  /*
  |---------------------------------------------------------------------------
  | Register capability listeners
  |---------------------------------------------------------------------------
  |
  | This method registers all capability listeners.
  |
  */

  _registerCapabilityListeners() {
    this.registerCapabilityListener('download_enabled', async (enabled) => {
      if (enabled) {
        return this.resumedownload();
      }

      return this.pausedownload();
    });
  }

  /*
  |---------------------------------------------------------------------------
  | Refresh interval timer
  |---------------------------------------------------------------------------
  |
  | This method sets the refresh interval in seconds.
  |
  */

  _setRefreshTimer(seconds = 0) {
    if (this._refreshTimer) {
      this.homey.clearInterval(this._refreshTimer);

      this._refreshTimer = null;
    }

    if (seconds === 0) {
      this.log('Refresh timer stopped');

      return;
    }

    const refreshInterval = seconds * 1000;

    this._refreshTimer = this.homey.setInterval(async () => {
      await this._updateDevice();
    }, refreshInterval);

    this.log(`Refresh interval set to ${seconds} seconds`);
  }

  /*
  |---------------------------------------------------------------------------
  | Convert seconds to time
  |---------------------------------------------------------------------------
  |
  | This method converts seconds to a readable format.
  |
  */

  _toTime(sec) {
    const sec_num = parseInt(sec, 10);
    let hours = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    let seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours < 10) {
      hours = "0" + hours;
    }
    if (minutes < 10) {
      minutes = "0" + minutes;
    }
    if (seconds < 10) {
      seconds = "0" + seconds;
    }

    return hours + ':' + minutes + ':' + seconds;
  }

}

module.exports = NZBDevice;
