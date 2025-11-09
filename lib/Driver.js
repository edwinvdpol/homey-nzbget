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
  async onPair(session) {
    this.log('Pairing servers');

    const onLogin = async (data) => {
      this.log('Connecting to server');

      let store;
      let client;
      let version;

      try {
        // Get store data
        store = this.getStoreData(data);

        // Setup client
        client = new Client(store);

        // Get version
        version = await client.call('version');

        // Check if the version valid
        if (Number(version) < 15) {
          throw new Error(this.homey.__('error.version', { version }));
        }

        data.version = version;

        // Emit create device event
        await session.emit('create', this.getDeviceData(data));
      } catch (err) {
        this.error('[Pair]', err.message);
        throw new Error(this.homey.__(err.message) || err.message);
      } finally {
        store = null;
        client = null;
        version = null;
      }
    };

    session.setHandler('login', onLogin);
  }

  /**
   * Repairing
   *
   * @param session
   * @param {NZBDevice|Device} device
   */
  async onRepair(session, device) {
    this.log('[Repair] Session connected');

    const onDisconnect = async () => {
      this.log('[Repair] Session disconnected');
    };

    const onLogin = async (data) => {
      this.log('[Repair] Connecting');

      let store;
      let client;
      let version;

      try {
        // Get store data
        store = this.getStoreData(data);

        // Setup client
        client = new Client(store);

        // Get version
        version = await client.call('version');

        // Check if the version valid
        if (Number(version) < 15) {
          throw new Error(this.homey.__('error.version', { version }));
        }

        // Save store values
        await device.setStoreValues(store);

        // Close the pair session
        await session.done();
      } catch (err) {
        this.error('[Repair]', err.message);
        throw new Error(this.homey.__(err.message) || err.message);
      } finally {
        store = null;
        client = null;
        version = null;
      }
    };

    session
      .setHandler('login', onLogin)
      .setHandler('disconnect', onDisconnect);
  }

  // Return data to create the device
  getDeviceData(device) {
    const data = {
      name: `NZBGet v${device.version}`,
      data: {
        id: uuidv4(),
      },
      store: this.getStoreData(device),
    };

    this.log('Device found', JSON.stringify(data));

    return data;
  }

  // Return store data
  getStoreData(device) {
    return {
      host: device.host || 'http://127.0.0.1',
      port: Number(device.port) || 6789,
      user: device.user || 'nzbget',
      pass: device.pass || 'tegbzn6789',
    };
  }

}

module.exports = Driver;
