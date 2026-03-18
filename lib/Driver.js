'use strict';

const Homey = require('homey');
const Client = require('./Client');
const Data = require('./Data');

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

    const onLogin = async (raw) => {
      this.log('Connecting to server');

      let data;
      let client;
      let version;

      try {
        // Create data object
        data = new Data(raw);

        // Setup client
        client = new Client(data.store);

        // Get version
        version = await client.call('version');

        // Check if the version valid
        if (Number(version) < 15) {
          throw new Error(this.homey.__('error.version', { version }));
        }

        // Emit create device event
        await session.emit('create', data.device);
      } catch (err) {
        this.error('[Pair]', err.message);
        throw new Error(this.homey.__(err.message) || err.message);
      } finally {
        data = null;
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

    const onLogin = async (raw) => {
      this.log('[Repair] Connecting');

      let data;
      let client;
      let version;

      try {
        // Create data object
        data = new Data(raw);

        // Setup client
        client = new Client(data.store);

        // Get version
        version = await client.call('version');

        // Check if the version valid
        if (Number(version) < 15) {
          throw new Error(this.homey.__('error.version', { version }));
        }

        // Save store values
        await device.setStoreValues(data.store);

        // Close the pair session
        await session.done();
      } catch (err) {
        this.error('[Repair]', err.message);
        throw new Error(this.homey.__(err.message) || err.message);
      } finally {
        data = null;
        client = null;
        version = null;
      }
    };

    session
      .setHandler('login', onLogin)
      .setHandler('disconnect', onDisconnect);
  }

}

module.exports = Driver;
