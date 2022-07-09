'use strict';

const Homey = require('homey');
const {v4: uuidv4} = require('uuid');

class Driver extends Homey.Driver {

  // Driver initialized
  async onInit() {
    this.log('Driver initialized');
  }

  // Get connect data, merged with defaults
  getConnectSettings(data) {
    return {
      host: data.host || 'http://127.0.0.1',
      port: Number(data.port) || 6789,
      user: data.user || 'nzbget',
      pass: data.pass || 'tegbzn6789'
    };
  }

  // Get data to create the device
  getDeviceData(data) {
    return {
      name: `NZBGet v${data.version}`,
      data: {
        id: uuidv4()
      },
      settings: this.getConnectSettings(data)
    };
  }

}

module.exports = Driver;
