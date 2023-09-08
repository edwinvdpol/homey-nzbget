'use strict';

const Homey = require('homey');
const { v4: uuidv4 } = require('uuid');
const Client = require('./Client');

class Driver extends Homey.Driver {

  /*
  | Driver events
  */

  // Driver initialized
  async onInit() {
    this.log('Initialized');
  }

  // Driver destroyed
  async onUninit() {
    this.log('Destroyed');
  }

  /*
  | Pairing functions
  */

  // Pair devices
  onPair(session) {
    this.log('Pairing servers');

    session.setHandler('connect', async (data) => {
      this.log('Connecting to server');

      let settings;
      let client;
      let version;

      try {
        // Get connection settings
        settings = this.getConnectSettings(data);

        // Setup client
        client = new Client(settings);

        // Get version
        version = await client.call('version');

        // Check if the version valid
        if (Number(version) < 15) {
          throw new Error(this.homey.__('errors.version', { version }));
        }

        data.version = version;

        // Emit create device event
        await session.emit('create', this.getDeviceData(data));
      } catch (err) {
        throw new Error(this.homey.__(err.message));
      } finally {
        settings = null;
        client = null;
        version = null;
      }
    });
  }

  // Return connect settings
  getConnectSettings(device) {
    // Remove trailing slash
    if (device.host.slice(-1) === '/') {
      device.host = device.host.slice(0, -1);
    }

    return {
      host: device.host || 'http://127.0.0.1',
      port: Number(device.port) || 6789,
      user: device.user || 'nzbget',
      pass: device.pass || 'tegbzn6789',
    };
  }

  // Return data to create the device
  getDeviceData(device) {
    const data = {
      name: `NZBGet v${device.version}`,
      data: {
        id: uuidv4(),
      },
      settings: this.getConnectSettings(device),
    };

    this.log('Device found', JSON.stringify(data));

    return data;
  }

}

module.exports = Driver;
