'use strict';

const Homey = require('homey');
const Api = require('/lib/Api.js');

let foundServer = [];
let minimalVersion = 15;

class NZBDriver extends Homey.Driver {

  /*
  |---------------------------------------------------------------------------
  | Initiate
  |---------------------------------------------------------------------------
  |
  | This method is called when the driver is initiated.
  |
  */

  async onInit() {
    await this._addFlowCardActions();
  }

  /*
  |---------------------------------------------------------------------------
  | Pairing
  |---------------------------------------------------------------------------
  |
  | This method is called when a pair session starts.
  |
  */

  onPair(socket) {
    this.log('Pairing started');

    socket.on('search_devices', async (data, callback) => {
      this.log('Searching for devices...');

      foundServer = [];

      try {
        const version = await new Api(data).version();

        if (version < minimalVersion) {
          callback(new Error(`Version ${version} is not supported`));
        }

        foundServer.push({
          name: `NZBGet v${version}`,
          data: data
        });

        callback(null, true);
      } catch (err) {
        callback(err);
      }
    });

    socket.on('list_devices', async (data, callback) => {
      this.log(`Found: ${foundServer[0].name}`);
      callback(null, foundServer);
    });
  }

  /*
  |---------------------------------------------------------------------------
  | Add flowcard actions
  |---------------------------------------------------------------------------
  |
  | Register flowcard actions which can be used in Homey 'Then' section.
  |
  */

  async _addFlowCardActions() {
    // Pause download queue
    new Homey.FlowCardAction('pausedownload').register().registerRunListener(async (args) => {
      return args.device.pausedownload();
    });

    // Set download speed limit
    new Homey.FlowCardAction('rate').register().registerRunListener(async (args) => {
        return args.device.rate(args);
    }).getArgument('download_rate');

    // Reload server
    new Homey.FlowCardAction('reload').register().registerRunListener(async (args) => {
      return args.device.reload();
    });

    // Resume download queue
    new Homey.FlowCardAction('resumedownload').register().registerRunListener(async (args) => {
      return args.device.resumedownload();
    });

    // Scan incoming directory for nzb-files
    new Homey.FlowCardAction('scan').register().registerRunListener(async (args) => {
      return args.device.scan();
    });

    // Shutdown server
    new Homey.FlowCardAction('shutdown').register().registerRunListener(async (args) => {
      return args.device.shutdown();
    });
  }

}

module.exports = NZBDriver;
