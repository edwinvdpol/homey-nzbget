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
    this.log(`Device is initiated`);

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
    return this.api.request({method: 'pausedownload'})
      .then(() => {
        this.setCapabilityValue('download_enabled', false);
        this.log('Paused download queue');
      }).catch(error => {
        this.error(`pausedownload: ${error}`);
      });
  }

  // Set download speed limit
  async rate(args) {
    let rate = Number(args.download_rate * 1000);

    return this.api.request({method: 'rate', params: [rate]})
      .then(() => {
        this.setCapabilityValue('rate_limit', args.download_rate);
        this.log(`Set download limit to ${args.download_rate} MB/s`);
      }).catch(error => {
        this.error(`rate: ${error}`);
      });
  }

  // Reload server
  async reload() {
    return this.api.request({method: 'reload'})
      .then(() => {
        this.log('Reloaded');
      }).catch(error => {
        this.error(`reload: ${error}`);
      });
  }

  // Resume download queue
  async resumedownload() {
    return this.api.request({method: 'resumedownload'})
      .then(() => {
        this.setCapabilityValue('download_enabled', true);
        this.log('Resumed download queue');
      }).catch(error => {
        this.error(`resumedownload: ${error}`);
      });
  }

  // Scan incoming directory for nzb-files
  async scan() {
    return this.api.request({method: 'scan'})
      .then(() => {
        this.log('Scanning incoming directory for nzb-files');
      }).catch(error => {
        this.error(`scan: ${error}`);
      });
  }

  // Shutdown server
  async shutdown() {
    return this.api.request({method: 'shutdown'})
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
    this.api.request({method: 'status'})
      .then(result => {
        this.setAvailable();

        var data = result.result;

        // Convert data
        var average_rate = parseFloat(data.AverageDownloadRate / 1024000);
        var download_enabled = (data.DownloadPaused ? false : true);
        var download_rate = parseFloat(data.DownloadRate / 1024000);
        var download_size = parseFloat(data.DownloadedSizeMB / 1024);
        var free_disk_space = Math.floor(data.FreeDiskSpaceMB / 1024);
        var rate_limit = Number(data.DownloadLimit / 1024000);

        // Capability values
        this.setCapabilityValue('article_cache', parseFloat(data.ArticleCacheMB));
        this.setCapabilityValue('average_rate', average_rate);
        this.setCapabilityValue('download_enabled', download_enabled);
        this.setCapabilityValue('download_rate', download_rate);
        this.setCapabilityValue('download_size', download_size);
        this.setCapabilityValue('download_time', this._toTime(Number(data.DownloadTimeSec)));
        this.setCapabilityValue('free_disk_space', free_disk_space);
        this.setCapabilityValue('rate_limit', rate_limit);
        this.setCapabilityValue('remaining_size', Number(data.RemainingSizeMB));
        this.setCapabilityValue('uptime', this._toTime(data.UpTimeSec));

      }).then(() => {
      this.api.request({method: 'listfiles'})
        .then(result => {
          var remaining_files = Object.keys(result.result).length;
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
      } else {
        return this.pausedownload();
      }
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

    var refreshInterval = seconds * 1000;

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
    var sec_num = parseInt(sec, 10);
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

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
