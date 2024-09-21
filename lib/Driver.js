'use strict';

const Homey = require('homey');

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
    this.log('[Pair] Started');

    const onLogin = async (data) => {
      this.log('[Pair] Connecting to server');

      let store;
      let server;
      let client;

      try {
        // Get store data
        store = this.getStoreData(data);

        // Setup client
        client = new Client(store);

        // Get server
        server = await client.getServer();

        // Check if the version valid
        if (!server.valid) {
          throw new Error(this.homey.__('error.version', { version: server.version }));
        }

        // Emit create device event
        await session.emit('create', server.data);
      } catch (err) {
        this.error('[Pair]', err.toString());
        throw new Error(this.homey.__(err.message) || err.message);
      } finally {
        store = null;
        server = null;
        client = null;
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
      let server;
      let client;

      try {
        // Get store data
        store = this.getStoreData(data);

        // Setup client
        client = new Client(store);

        // Get version
        server = await client.getServer();

        // Check if the version valid
        if (!server.valid) {
          throw new Error(this.homey.__('error.version', { version: server.version }));
        }

        // Save store values
        await device.setStoreValues(store);

        // Close the pair session
        await session.done();
      } catch (err) {
        this.error('[Repair]', err.toString());
        throw new Error(this.homey.__(err.message) || err.message);
      } finally {
        store = null;
        server = null;
        client = null;
      }
    };

    session
      .setHandler('login', onLogin)
      .setHandler('disconnect', onDisconnect);
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
