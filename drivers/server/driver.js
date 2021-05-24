'use strict';

const Homey = require('homey');
const Api = require('/lib/Api.js');

let minimalVersion = 15;

class NZBDriver extends Homey.Driver {

  // Pairing
  onPair(session) {
    this.log('Pairing started');

    session.setHandler('connect', async (data) => {
      this.log('Connecting to server...');

      try {
        // Merge data with defaults
        data = this.mergeData(data);

        const version = await new Api(data).version();

        if (Number(version) >= minimalVersion) {
          await session.emit('create', {
            name: `NZBGet v${version}`,
            data: data
          });
        }
      } catch (err) {
        throw new Error(this.homey.__(err.message));
      }
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
