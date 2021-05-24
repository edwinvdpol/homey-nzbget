'use strict';

const Homey = require('homey');

class NZBApp extends Homey.App {

  // Initialized
  async onInit() {
    this.log('NZBApp is running...');

    await this.registerActions();
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
    }).getArgument('download_rate');

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

}

module.exports = NZBApp;
