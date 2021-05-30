'use strict';

const Homey = require('homey');
const Api = require('./lib/Api');

class NZBApp extends Homey.App {

  // Initialized
  async onInit() {
    this.log('NZBApp is running...');

    // Initiate API client
    if (!this.client) {
      this.client = new Api({ homey: this.homey });
    }

    // Register actions and condition flow cards
    this.registerActions();
    this.registerConditions();

    // Event listeners
    this.homey.on('cpuwarn', () => {
      this.log('-- CPU warning! --');
    }).on('memwarn', () => {
      this.log('-- Memory warning! --');
    }).on('unload', () => {
      this.client = null;

      this.log('-- Unloaded! _o/ --');
    });
  }

  // Register flowcard actions
  registerActions() {
    // ... then pause download queue ...
    this.homey.flow.getActionCard('pausedownload').registerRunListener(async args => {
      return args.device.pausedownload();
    });

    // ... then set download speed limit ...
    this.homey.flow.getActionCard('rate').registerRunListener(async args => {
      return args.device.rate(args);
    });

    // ... then reload server ...
    this.homey.flow.getActionCard('reload').registerRunListener(async args => {
      return args.device.reload();
    });

    // ... then resume download queue ...
    this.homey.flow.getActionCard('resumedownload').registerRunListener(async args => {
      return args.device.resumedownload();
    });

    // ... then scan incoming directory for nzb-files ...
    this.homey.flow.getActionCard('scan').registerRunListener(async args => {
      return args.device.scan();
    });

    // ... then shutdown ...
    this.homey.flow.getActionCard('shutdown').registerRunListener(async args => {
      return args.device.shutdown();
    });
  }

  // Register flowcard conditions
  registerConditions() {
    // ... and download queue is active...
    this.homey.flow.getConditionCard('download_enabled').registerRunListener(async args => {
      return args.device.getCapabilityValue('download_enabled') === true;
    });
  }

  // Request for file’s list of a group.
  listfiles(data, id = 0) {
    if (id > 0) {
      return this.client.call('listfiles', data, [0, 0, id]);
    }

    return this.client.call('listfiles', data);
  }

  // Pause download queue
  pausedownload(data) {
    return this.client.call('pausedownload', data);
  }

  // Set download speed limit in MB/second.
  rate(data, limit = 0) {
    // KB/s => MB/s
    limit = Number(limit * 1000);

    return this.client.call('rate', data, [limit]);
  }

  // Reload
  reload(data) {
    return this.client.call('reload', data);
  }

  // Resume (previously paused) download queue.
  resumedownload(data) {
    return this.client.call('resumedownload', data);
  }

  // Request rescanning of incoming directory for nzb-files.
  scan(data) {
    return this.client.call('scan', data);
  }

  // Shutdown
  shutdown(data) {
    return this.client.call('shutdown', data);
  }

  // Status
  status(data) {
    return this.client.call('status', data);
  }

  // Version
  version(data) {
    return this.client.call('version', data);
  }

}

module.exports = NZBApp;
