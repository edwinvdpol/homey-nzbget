'use strict';

const Homey = require('homey');
const Flow = require('./Flow');
const Api = require('./Api');

class App extends Homey.App {

  // App initialized
  async onInit() {
    // Register event listeners
    this.homey.on('unload', this.onUnload.bind(this));

    // Register flow cards
    this.flow = new Flow({homey: this.homey});

    // Initiate API client
    this.client = new Api({homey: this.homey});

    this.log('Application initialized');
  }

  // Application destroyed
  async onUninit() {
    this.clean();

    this.log('Application destroyed');
  }

  // Application unload
  async onUnload() {
    this.clean();

    this.log('Application unloaded');
  }

  // Clean application data
  clean() {
    if (this.client) {
      this.client.removeAllListeners();
    }

    this.client = null;
    this.flow = null;

    this.log('Application data cleaned');
  }

}

module.exports = App;
