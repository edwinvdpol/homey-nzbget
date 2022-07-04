'use strict';

const Homey = require('homey');
const Flow = require('./Flow')
const Api = require('./Api');

class NZBApp extends Homey.App {

  // App initialized
  async onInit() {
    // Initiate API client
    this.client = new Api({ homey: this.homey });

    // Set flows
    this.flow = new Flow({ homey: this.homey });

    // Register flow cards
    this.flow.register().catch(this.error);

    // Register event listeners
    this.registerEventListeners().catch(this.error);
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
