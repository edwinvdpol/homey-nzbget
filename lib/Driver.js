'use strict';

const Homey = require('homey');
const { v4: uuidv4 } = require('uuid');

class Driver extends Homey.Driver {

  // Driver initialized
  async onInit() {
    // Register flow cards
    this.registerActionFlowCards();
    this.registerConditionFlowCards();
    this.registerDeviceTriggerFlowCards();

    this.log('Initialized');
  }

  // Return connect settings
  getConnectSettings(data) {
    // Remove trailing slash
    if (data.host.slice(-1) === '/') {
      data.host = data.host.slice(0, -1);
    }

    return {
      host: data.host || 'http://127.0.0.1',
      port: Number(data.port) || 6789,
      user: data.user || 'nzbget',
      pass: data.pass || 'tegbzn6789',
    };
  }

  // Return data to create the device
  getDeviceData(data) {
    return {
      name: `NZBGet v${data.version}`,
      data: {
        id: uuidv4(),
      },
      settings: this.getConnectSettings(data),
    };
  }

  /*
  | Register flow cards functions
  */

  // Register action flow cards
  registerActionFlowCards() {
    // ... then pause download queue ...
    this.homey.flow.getActionCard('pausedownload').registerRunListener(async ({ device }) => {
      await device.pausedownload();
    });

    // ... then set download speed limit ...
    this.homey.flow.getActionCard('rate').registerRunListener(async ({ device, downloadRate }) => {
      return device.rate(downloadRate);
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
  registerConditionFlowCards() {
    // ... and download queue is active...
    this.homey.flow.getConditionCard('download_enabled').registerRunListener(async ({ device }) => {
      return device.getCapabilityValue('download_enabled') === true;
    });
  }

  // Register device trigger flow cards
  registerDeviceTriggerFlowCards() {
    // When NZBGet was reloaded ...
    this.reloadedTrigger = this.homey.flow.getDeviceTriggerCard('program_reloaded');

    // When NZBGet was shut down ...
    this.shutdownTrigger = this.homey.flow.getDeviceTriggerCard('program_shutdown');
  }

}

module.exports = Driver;
