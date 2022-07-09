'use strict';

const Driver = require('../../lib/Driver');

class NZBDriver extends Driver {

  // Pairing
  onPair(session) {
    this.log('Pairing started');

    session.setHandler('connect', async (data) => {
      this.log('Connecting to server');

      // Remove trailing slash
      if (data.host.slice(-1) === '/') {
        data.host = data.host.slice(0, -1);
      }

      // Get connection settings
      const settings = this.getConnectSettings(data);

      // Get version
      const version = await this.homey.app.client.call('version', settings);

      // Check if the version valid
      if (Number(version) < 15) {
        throw new Error(this.homey.__('api.version', {version}));
      }

      data.version = version;

      // Emit create device event
      await session.emit('create', this.getDeviceData(data));
    });
  }

}

module.exports = NZBDriver;
