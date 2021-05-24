'use strict';

const Homey = require('homey');
const Api = require('/lib/Api.js');

let minimalVersion = 15;

class NZBDriver extends Homey.Driver {

  /*
  |---------------------------------------------------------------------------
  | Pairing
  |---------------------------------------------------------------------------
  |
  | This method is called when a pair session starts.
  |
  */

  onPair(session) {
    this.log('Pairing started');

    session.setHandler('search_devices', async (data) => {
      this.log('Connecting to server...');
      this.log('Credentials:', data);

      try {
        const version = await new Api(data).version();

        if (Number(version) >= minimalVersion) {
          await session.emit('add_server', {
            name: `NZBGet v${version}`,
            data: data
          });
        }
      } catch (err) {
        throw new Error(this.homey.__(err.message));
      }
    });
  }

}

module.exports = NZBDriver;
