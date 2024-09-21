'use strict';

const { v4: uuidv4 } = require('uuid');
const { blank, filled } = require('../lib/Utils');

class Server {

  /**
   * Represents a server.
   *
   * @constructor
   */
  constructor(data) {
    this.status = data.status;
    this.files = data.files;
    this.store = data.store;
    this.version = data.version;
  }

  /**
   * Return device capability values.
   *
   * @return {Object}
   */
  get capabilityValues() {
    if (!this.valid) return {};

    return Object.fromEntries(Object.entries({
      article_cache: parseFloat(this.status.ArticleCacheMB),
      average_rate: parseFloat(this.status.AverageDownloadRate / 1024000),
      download_enabled: !this.status.DownloadPaused,
      download_rate: parseFloat(this.status.DownloadRate / 1024000),
      download_size: parseFloat(this.status.DownloadedSizeMB / 1024),
      download_time: this.toTime(Number(this.status.DownloadTimeSec)),
      free_disk_space: Math.floor(this.status.FreeDiskSpaceMB / 1024),
      rate_limit: Number(this.status.DownloadLimit / 1024000),
      remaining_files: Object.keys(this.files).length,
      remaining_size: Number(this.status.RemainingSizeMB),
      uptime: this.toTime(this.status.UpTimeSec),
    }).filter(([_, v]) => filled(v)));
  }

  /**
   * Return device data.
   *
   * @return {Object}
   */
  get data() {
    if (!this.valid) return {};

    return {
      name: `NZBGet v${this.version}`,
      data: {
        id: uuidv4(),
      },
      store: this.store,
    };
  }

  /**
   * Return whether device is valid.
   *
   * @return {boolean}
   */
  get valid() {
    if (blank(this.version)) return true;

    return this.version >= 15;
  }

  /**
   * Convert seconds to time.
   *
   * @param sec
   * @return {string}
   */
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

module.exports = Server;
