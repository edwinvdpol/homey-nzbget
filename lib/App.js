'use strict';

const Homey = require('homey');
const { Log } = require('homey-log');

class App extends Homey.App {

  /*
  | Application events
  */

  // Application initialized
  async onInit() {
    // Sentry logging
    this.homeyLog = new Log({ homey: this.homey });

    // Register flow cards
    this.registerFlowCards();

    this.log('Initialized');
  }

  /*
  | Support functions
  */

  // Register flow cards
  registerFlowCards() {
    this.log('Registering flow cards...');

    // Device trigger flow cards
    // When NZBGet was reloaded ...
    this.reloadedTrigger = this.homey.flow.getDeviceTriggerCard('program_reloaded');

    // When NZBGet was shut down ...
    this.shutdownTrigger = this.homey.flow.getDeviceTriggerCard('program_shutdown');

    // Action flow cards
    // ... then pause download queue ...
    this.homey.flow.getActionCard('pausedownload').registerRunListener(async ({ device }) => {
      await device.pausedownload();
    });

    // ... then set download speed limit ...
    // eslint-disable-next-line camelcase
    this.homey.flow.getActionCard('rate').registerRunListener(async ({ device, download_rate }) => {
      return device.rate(download_rate);
    });

    // ... then reload server ...
    this.homey.flow.getActionCard('reload').registerRunListener(async ({ device }) => {
      await device.reload();
    });

    // ... then resume download queue ...
    this.homey.flow.getActionCard('resumedownload').registerRunListener(async ({ device }) => {
      await device.resumedownload();
    });

    // ... then scan incoming directory for nzb-files ...
    this.homey.flow.getActionCard('scan').registerRunListener(async ({ device }) => {
      await device.scan();
    });

    // ... then shutdown ...
    this.homey.flow.getActionCard('shutdown').registerRunListener(async ({ device }) => {
      await device.shutdown();
    });

    // Condition flow cards
    // ... and download queue is active...
    this.homey.flow.getConditionCard('download_enabled').registerRunListener(async ({ device }) => {
      return device.getCapabilityValue('download_enabled') === true;
    });

    this.log('Flow cards registered');
  }

}

module.exports = App;
