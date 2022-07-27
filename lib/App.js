'use strict';

const Homey = require('homey');

class App extends Homey.App {

  // Application initialized
  async onInit() {
    this.log('Initialized');
  }

}

module.exports = App;
