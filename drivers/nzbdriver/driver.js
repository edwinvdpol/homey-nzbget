'use strict';

const Driver = require('../../lib/Driver');
const Client = require('../../lib/Client');

class NZBDriver extends Driver {

  // Pairing
  onPair(session) {
    this.log('Pairing started');

    session.setHandler('connect', async (data) => {
      this.log('Connecting to server');

      try {
        // Get connection settings
        const settings = this.getConnectSettings(data);

        // Setup client
        const client = new Client(settings);

        // Get version
        const version = await client.call('version');

        // Check if the version valid
        if (Number(version) < 15) {
          throw new Error(this.homey.__('api.version', { version }));
        }

        data.version = version;

        // Emit create device event
        await session.emit('create', this.getDeviceData(data));
      } catch (err) {
        throw new Error(this.homey.__(err.message));
      }
    });
  }

}

module.exports = NZBDriver;
