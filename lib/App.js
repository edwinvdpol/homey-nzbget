'use strict';

const Homey = require('homey');
const Flow = require('./Flow')
const Api = require('./Api');

class NZBApp extends Homey.App {

  // App initialized
  async onInit() {
    // Initiate API client
    this.client = new Api({ homey: this.homey });

    // Register flow cards
    await new Flow({ homey: this.homey }).register();

    // Register event listeners
    await this.registerEventListeners();
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
