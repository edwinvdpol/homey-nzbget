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

  onInit() {
    this.log('Device is initiated');

    // Register capability listeners
    this._registerCapabilityListeners();

    // Create API object
    this.api = new Api(this.getData());

    // Update device statistics on startup
    this._updateDevice();

    // Enable refresh timer
    this._setRefreshTimer(this.getSetting('refresh_interval'));
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
      this.log(`Device setting \`${name}\` set \`${oldSettings[name]}\` => \`${newSettings[name]}\``);

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
    clearInterval(this._deviceDataTimer);

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
    return this.api.pausedownload()
      .then(() => {
        this.setCapabilityValue('download_enabled', false);
        this.log('Paused download queue');
      }).catch(error => {
        this.error(`pausedownload: ${error}`);
      });
  }

  // Set download speed limit
  async rate(args) {
    return this.api.rate(args.download_rate)
      .then(() => {
        this.setCapabilityValue('rate_limit', args.download_rate);
        this.log(`Set download limit to ${args.download_rate} MB/s`);
      }).catch(error => {
        this.error(`rate: ${error}`);
      });
  }

  // Reload server
  async reload() {
    return this.api.reload()
      .then(() => {
        this.log('Reloaded');
      }).catch(error => {
        this.error(`reload: ${error}`);
      });
  }

  // Resume download queue
  async resumedownload() {
    return this.api.resumedownload()
      .then(() => {
        this.setCapabilityValue('download_enabled', true);
        this.log('Resumed download queue');
      }).catch(error => {
        this.error(`resumedownload: ${error}`);
      });
  }

  // Scan incoming directory for nzb-files
  async scan() {
    return this.api.scan()
      .then(() => {
        this.log('Scanning incoming directory for nzb-files');
      }).catch(error => {
        this.error(`scan: ${error}`);
      });
  }

  // Shutdown server
  async shutdown() {
    return this.api.shutdown()
      .then(() => {
        this.log('Shutdown');
      }).catch(error => {
        this.error(`shutdown: ${error}`);
      });
  }

  /*
  |---------------------------------------------------------------------------
  | Update device
  |---------------------------------------------------------------------------
  |
  | This method is periodically called to update the device.
  |
  */

  _updateDevice() {
    this.api.status()
      .then(result => {
        this.setAvailable();

        // Convert data
        const average_rate = parseFloat(result.AverageDownloadRate / 1024000);
        const download_enabled = (!result.DownloadPaused);
        const download_rate = parseFloat(result.DownloadRate / 1024000);
        const download_size = parseFloat(result.DownloadedSizeMB / 1024);
        const free_disk_space = Math.floor(result.FreeDiskSpaceMB / 1024);
        const rate_limit = Number(result.DownloadLimit / 1024000);

        // Capability values
        this.setCapabilityValue('article_cache', parseFloat(result.ArticleCacheMB));
        this.setCapabilityValue('average_rate', average_rate);
        this.setCapabilityValue('download_enabled', download_enabled);
        this.setCapabilityValue('download_rate', download_rate);
        this.setCapabilityValue('download_size', download_size);
        this.setCapabilityValue('download_time', this._toTime(Number(result.DownloadTimeSec)));
        this.setCapabilityValue('free_disk_space', free_disk_space);
        this.setCapabilityValue('rate_limit', rate_limit);
        this.setCapabilityValue('remaining_size', Number(result.RemainingSizeMB));
        this.setCapabilityValue('uptime', this._toTime(result.UpTimeSec));

      }).then(() => {
      this.api.listfiles()
        .then(result => {
          const remaining_files = Object.keys(result).length;
          this.setCapabilityValue('remaining_files', remaining_files);
        });

    }).catch(error => {
      this.error(error);
      this.setUnavailable(error);
    });
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
    this.registerCapabilityListener('download_enabled', (value) => {
      if (value) {
        return this.resumedownload();
      }

      return this.pausedownload();
    });
  }

  /*
  |---------------------------------------------------------------------------
  | Set the refresh interval timer
  |---------------------------------------------------------------------------
  |
  | This method sets the refresh interval in seconds.
  |
  */

  _setRefreshTimer(seconds) {
    if (this._deviceDataTimer) {
      clearInterval(this._deviceDataTimer);
    }

    const refreshInterval = seconds * 1000;

    this._deviceDataTimer = setInterval(() => {
      this._updateDevice();
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
