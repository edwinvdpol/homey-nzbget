'use strict';

const Homey = require('homey');
const Flow = require('./Flow')
const Api = require('./Api');

class NZBApp extends Homey.App {

  // App initialized
  async onInit() {
    // Initiate API client
    this.client = new Api({ homey: this.homey });

    // Set flow
    this.flow = new Flow({ homey: this.homey });

    // Register flow cards
    await this.flow.register();

    // Register event listeners
    await this.registerEventListeners();
  }

  // Register event listeners
  async registerEventListeners() {
    this.homey.on('unload', () => {
      this.client = null;
      this.flow = null;
    });
  }

}

module.exports = NZBApp;
