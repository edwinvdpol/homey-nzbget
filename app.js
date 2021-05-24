'use strict';

const Homey = require('homey');

class NZBApp extends Homey.App {

  // Initialized
  async onInit() {
    this.log('NZBApp is running...');

    await this.registerActions();
    await this.registerConditions();
  }

  // Register flowcard actions
  async registerActions() {
    // ... then pause download queue ...
    this.homey.flow.getActionCard('pausedownload').registerRunListener(async (args) => {
      return args.device.pausedownload();
    });

    // ... then set download speed limit ...
    this.homey.flow.getActionCard('rate').registerRunListener(async (args) => {
      return args.device.rate(args);
    });

    // ... then reload server ...
    this.homey.flow.getActionCard('reload').registerRunListener(async (args) => {
      return args.device.reload();
    });

    // ... then resume download queue ...
    this.homey.flow.getActionCard('resumedownload').registerRunListener(async (args) => {
      return args.device.resumedownload();
    });

    // ... then scan incoming directory for nzb-files ...
    this.homey.flow.getActionCard('scan').registerRunListener(async (args) => {
      return args.device.scan();
    });

    // ... then shutdown ...
    this.homey.flow.getActionCard('shutdown').registerRunListener(async (args) => {
      return args.device.shutdown();
    });
  }

  // Register flowcard conditions
  async registerConditions() {
    // ... and download queue is active...
    this.homey.flow.getConditionCard('download_enabled').registerRunListener(async (args) => {
      return args.device.getCapabilityValue('download_enabled') === true;
    });
  }

}

module.exports = NZBApp;
