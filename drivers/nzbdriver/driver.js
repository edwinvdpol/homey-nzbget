'use strict';

const Homey = require('homey');
const { v4: uuidv4 } = require('uuid');

class NZBDriver extends Homey.Driver {

  static MINIMUMVERSION = 15;

  // Pairing
  onPair(session) {
    this.log('Pairing started');

    session.setHandler('connect', async data => {
      this.log('Connecting to server...');

      // Remove trailing slash
      if (data.host.slice(-1) === '/') {
        data.host = data.host.slice(0, -1);
      }

      // Get connection data
      const connectData = this.connectData(data);

      // Get version
      const version = await this.homey.app.version(connectData).catch(err => {
        throw new Error(err.message);
      });

      // Check if the version valid
      if (Number(version) < this.constructor.MINIMUMVERSION) {
        throw new Error(this.homey.__('api.version', { version }));
      }

      data.version = version;

      // Get create device data
      const createData = this.getCreateData(data);

      // Emit create device event
      await session.emit('create', createData);
    });
  }

  // Get data to create the device
  getCreateData(data) {
    return {
      name: `NZBGet v${data.version}`,
      data: {
        id: uuidv4(),
      },
      settings: this.connectData(data),
    };
  }

  // Rerturn data, merged with defaults
  connectData(data) {
    return {
      host: data.host || 'http://127.0.0.1',
      user: data.user || 'nzbget',
      pass: data.pass || 'tegbzn6789',
      port: data.port || 6789,
    };
  }

}

module.exports = NZBDriver;
