'use strict';

const Device = require('../../lib/Device');

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
    if (data.hasOwnProperty('ArticleCacheMB')) {
      this.setCapabilityValue('article_cache', parseFloat(data.ArticleCacheMB)).catch(this.error);
    }

    if (data.hasOwnProperty('AverageDownloadRate')) {
      this.setCapabilityValue('average_rate', parseFloat(data.AverageDownloadRate / 1024000)).catch(this.error);
    }

    if (data.hasOwnProperty('DownloadPaused')) {
      this.setCapabilityValue('download_enabled', !data.DownloadPaused).catch(this.error);
    }

    if (data.hasOwnProperty('DownloadRate')) {
      this.setCapabilityValue('download_rate', parseFloat(data.DownloadRate / 1024000)).catch(this.error);
    }

    if (data.hasOwnProperty('DownloadedSizeMB')) {
      this.setCapabilityValue('download_size', parseFloat(data.DownloadedSizeMB / 1024)).catch(this.error);
    }

    if (data.hasOwnProperty('DownloadTimeSec')) {
      this.setCapabilityValue('download_time', this.toTime(Number(data.DownloadTimeSec))).catch(this.error);
    }

    if (data.hasOwnProperty('FreeDiskSpaceMB')) {
      this.setCapabilityValue('free_disk_space', Math.floor(data.FreeDiskSpaceMB / 1024)).catch(this.error);
    }

    if (data.hasOwnProperty('DownloadLimit')) {
      this.setCapabilityValue('rate_limit', Number(data.DownloadLimit / 1024000)).catch(this.error);
    }

    if (data.hasOwnProperty('RemainingSizeMB')) {
      this.setCapabilityValue('remaining_size', Number(data.RemainingSizeMB)).catch(this.error);
    }

    if (data.hasOwnProperty('UpTimeSec')) {
      this.setCapabilityValue('uptime', this.toTime(data.UpTimeSec)).catch(this.error);
    }

    if (data.hasOwnProperty('Files')) {
      this.setCapabilityValue('remaining_files', Object.keys(data.Files).length).catch(this.error);
    }

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

    await this.call('rate', null, [limit]);

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
    await this.homey.app.flow.reloadedTrigger.trigger(device);
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
    await this.homey.app.flow.shutdownTrigger.trigger(device);
  }

}

module.exports = NZBDevice;
