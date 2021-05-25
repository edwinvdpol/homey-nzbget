'use strict';

const Homey = require('homey');
const Api = require('/lib/Api.js');

const minimalVersion = 15;

class NZBDriver extends Homey.Driver {

  // Pairing
  onPair(session) {
    this.log('Pairing started');

    session.setHandler('connect', async (data) => {
      this.log('Connecting to server...');

      // Merge data with defaults
      data = this.mergeData(data);

      const version = await new Api(data).version().catch(err => {
        throw new Error(this.homey.__(err.message));
      });

      if (Number(version) < minimalVersion) {
        throw new Error(this.homey.__('api.version', {version: version}));
      }

      await session.emit('create', {
        name: `NZBGet v${version}`,
        data: data
      });
    });
  }

  // Merge data with defaults
  mergeData(data) {
    return {
      host: data.host || 'http://127.0.0.1',
      user: data.user || 'nzbget',
      pass: data.pass || 'tegbzn6789',
      port: data.port || 6789
    }
  }
}

module.exports = NZBDriver;
