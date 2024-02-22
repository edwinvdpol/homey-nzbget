'use strict';

const Device = require('../../lib/Device');
const { blank } = require('../../lib/Utils');
const Client = require('../../lib/Client');

class NZBDevice extends Device {

  /*
  | Device events
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
  | Synchronization functions
  */

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

    this.setAvailable().catch(this.error);
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

    // Wait until the driver is ready
    await this.driver.ready();

    await this.call('reload');

    let device = this;

    // Trigger program reloaded flow card
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

    // Wait until the driver is ready
    await this.driver.ready();

    await this.call('shutdown');

    let device = this;

    // Trigger program shutdown flow card
    await this.homey.shutdownTrigger.trigger(device);

    device = null;
  }

  /*
  | Support functions
  */

  async call(cmd, params = []) {
    let client;

    try {
      client = new Client(this.getSettings());

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

}

module.exports = NZBDevice;
