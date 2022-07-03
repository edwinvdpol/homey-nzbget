'use strict';

class Flow {

  // Constructor
  constructor({ homey }) {
    this.homey = homey;
  }

  // Register flow cards
  async register() {
    try {
      await this._registerActionFlowCards();
      await this._registerConditionFlowCards();
      await this._registerDeviceTriggerFlowCards();
    } catch (err) {
      this.homey.error(`Could not register flow cards: ${err.message}`);
    }
  }

  // Register action flow cards
  async _registerActionFlowCards() {
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
  async _registerConditionFlowCards() {
    // ... and download queue is active...
    this.homey.flow.getConditionCard('download_enabled').registerRunListener(async ({ device }) => {
      return device.getCapabilityValue('download_enabled') === true;
    });
  }

  // Register device trigger flow cards
  async _registerDeviceTriggerFlowCards() {
    // When NZBGet was reloaded ...
    this.reloadedTrigger = this.homey.flow.getDeviceTriggerCard('program_reloaded');

    // When NZBGet was shut down ...
    this.shutdownTrigger = this.homey.flow.getDeviceTriggerCard('program_shutdown');
  }

}

module.exports = Flow;
