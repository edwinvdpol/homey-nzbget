'use strict';

const { v4: uuidv4 } = require('uuid');
const { clean } = require('./Utils');

class Data {

  constructor(raw) {
    Object.assign(this, clean({
      ...this.fromApiData(raw),
      ...this.fromLoginData(raw),
    }));
  }

  get device() {
    return {
      name: 'NZBGet',
      data: { id: uuidv4() },
      store: this.store,
    };
  }

  get store() {
    return {
      host: this.host || 'http://127.0.0.1',
      port: this.port || 6789,
      user: this.user || 'nzbget',
      pass: this.pass || 'tegbzn6789',
    };
  }

  fromApiData(raw) {
    const data = {};

    if ('ArticleCacheMB' in raw) data.article_cache = Math.round((raw.ArticleCacheMB + Number.EPSILON) * 100) / 100;
    if ('AverageDownloadRate' in raw) data.average_rate = Math.round(((raw.AverageDownloadRate / 1024000) + Number.EPSILON) * 100) / 100;
    if ('DownloadPaused' in raw) data.download_enabled = !raw.DownloadPaused;
    if ('DownloadRate' in raw) data.download_rate = Math.round(((raw.DownloadRate / 1024000) + Number.EPSILON) * 100) / 100;
    if ('DownloadedSizeMB' in raw) data.download_size = Math.round(((raw.DownloadedSizeMB / 1024) + Number.EPSILON) * 100) / 100;
    if ('DownloadLimit' in raw) data.rate_limit = Number(raw.DownloadLimit / 1024000);
    if ('DownloadTimeSec' in raw) data.download_time = this.toTime(Number(raw.DownloadTimeSec));
    if ('Files' in raw) data.remaining_files = Object.keys(raw.Files).length;
    if ('FreeDiskSpaceMB' in raw) data.free_disk_space = Math.floor(raw.FreeDiskSpaceMB / 1024);
    if ('RemainingSizeMB' in raw) data.remaining_size = Number(raw.RemainingSizeMB);
    if ('UpTimeSec' in raw) data.uptime = this.toTime(raw.UpTimeSec);

    return data;
  }

  fromLoginData(raw) {
    const data = {};

    if ('host' in raw) data.host = raw.host;
    if ('port' in raw) data.port = Number(raw.port);
    if ('user' in raw) data.user = raw.user;
    if ('pass' in raw) data.pass = raw.pass;

    return data;
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

module.exports = Data;
