'use strict';

const Device = require('../../lib/Device');
const {filled} = require('../../lib/Utils');
const Client = require('../../lib/Client');

class NZBDevice extends Device {

  /*
  | Capabilities
  */

  // Download enabled capability changed
  async onCapabilityDownloadEnabled(enabled) {
    if (enabled) {
      return this.resumedownload();
    }

    await this.pausedownload();
  }

  // Set device data
  handleSyncData(data) {
    this.log('Update device', JSON.stringify(data));

    if (filled(data.ArticleCacheMB)) {
      this.setCapabilityValue('article_cache', parseFloat(data.ArticleCacheMB)).catch(this.error);
    }

    if (filled(data.AverageDownloadRate)) {
      this.setCapabilityValue('average_rate', parseFloat(data.AverageDownloadRate / 1024000)).catch(this.error);
    }

    if (filled(data.DownloadPaused)) {
      this.setCapabilityValue('download_enabled', !data.DownloadPaused).catch(this.error);
    }

    if (filled(data.DownloadRate)) {
      this.setCapabilityValue('download_rate', parseFloat(data.DownloadRate / 1024000)).catch(this.error);
    }

    if (filled(data.DownloadedSizeMB)) {
      this.setCapabilityValue('download_size', parseFloat(data.DownloadedSizeMB / 1024)).catch(this.error);
    }

    if (filled(data.DownloadTimeSec)) {
      this.setCapabilityValue('download_time', this.toTime(Number(data.DownloadTimeSec))).catch(this.error);
    }

    if (filled(data.FreeDiskSpaceMB)) {
      this.setCapabilityValue('free_disk_space', Math.floor(data.FreeDiskSpaceMB / 1024)).catch(this.error);
    }

    if (filled(data.DownloadLimit)) {
      this.setCapabilityValue('rate_limit', Number(data.DownloadLimit / 1024000)).catch(this.error);
    }

    if (filled(data.RemainingSizeMB)) {
      this.setCapabilityValue('remaining_size', Number(data.RemainingSizeMB)).catch(this.error);
    }

    if (filled(data.UpTimeSec)) {
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
  async rate(download_rate) {
    const limit = Number(download_rate * 1000);

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

    const device = this;

    // Trigger program reloaded flow card
    await this.driver.reloadedTrigger.trigger(device);
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

    const device = this;

    // Trigger program shutdown flow card
    await this.driver.shutdownTrigger.trigger(device);
  }

  /*
  | Support functions
  */

  async call(cmd, params = []) {
    try {
      const client = new Client(this.getSettings());

      return client.call(cmd, params);
    } catch (err) {
      throw new Error(this.homey.__(err.message));
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
