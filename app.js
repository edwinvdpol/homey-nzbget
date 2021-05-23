'use strict';

const Homey = require('homey');

class NZBApp extends Homey.App {

  /*
  |---------------------------------------------------------------------------
  | Initiate
  |---------------------------------------------------------------------------
  |
  | This method is called upon initialization of this application.
  |
  */

  async onInit() {
    this.log('Running');
  }

}

module.exports = NZBApp;
