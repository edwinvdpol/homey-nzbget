'use strict';

const Homey = require('homey');
const Api = require('./Api');

class NZBApp extends Homey.App {

  // App initialized
  async onInit() {
    // Initiate API client
    if (!this.client) {
      this.client = new Api({ homey: this.homey });
    }

    // Register actions, condition flow cards and event listeners
    await this.registerActionFlowCards();
    await this.registerConditionFlowCards();
    await this.registerEventListeners();
  }

  // Register action flow cards
  async registerActionFlowCards() {
    // ... then pause download queue ...
    this.homey.flow.getActionCard('pausedownload').registerRunListener(async ({ device }) => {
      await device.pausedownload();
    });

    // ... then set download speed limit ...
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
  }

  // Register condition flow cards
  async registerConditionFlowCards() {
    // ... and download queue is active...
    this.homey.flow.getConditionCard('download_enabled').registerRunListener(async ({ device }) => {
      return device.getCapabilityValue('download_enabled') === true;
    });
  }

  // Register event listeners
  async registerEventListeners() {
    this.homey.on('cpuwarn', () => {
      this.log('-- CPU warning! --');
    }).on('memwarn', () => {
      this.log('-- Memory warning! --');
    }).on('unload', () => {
      this.client = null;

      this.log('-- Unloaded! --');
    });
  }

}

module.exports = NZBApp;
