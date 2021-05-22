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

  onInit() {
    this._addFlowCardActions();
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

    socket.on('search_devices', async (pairData, callback) => {
      this.log('Searching for devices...');

      foundServer = [];

      var api = new Api(pairData);

      api.request({method: 'version'})
        .then(result => {
          var version = parseInt(result.result);

          if (version < minimalVersion) {
            throw new Error(`Version ${result.result} is not supported.`);
          }

          foundServer.push({
            name: `NZBGet v${result.result}`,
            data: {
              url: pairData.url,
              port: pairData.port,
              user: pairData.user,
              pass: pairData.pass
            }
          });

          callback(null, true);
        }).catch(error => {
        this.error(error);
        callback(error);
      });
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
    new Homey.FlowCardAction('pausedownload').register()
      .registerRunListener(async (args) => {
        return args.device.pausedownload();
      });

    // Set download speed limit
    new Homey.FlowCardAction('rate').register()
      .registerRunListener(async (args) => {
        return args.device.rate(args);
      })
      .getArgument('download_rate');

    // Reload server
    new Homey.FlowCardAction('reload').register()
      .registerRunListener(async (args) => {
        return args.device.reload();
      });

    // Resume download queue
    new Homey.FlowCardAction('resumedownload').register()
      .registerRunListener(async (args) => {
        return args.device.resumedownload();
      });

    // Scan incoming directory for nzb-files
    new Homey.FlowCardAction('scan').register()
      .registerRunListener(async (args) => {
        return args.device.scan();
      });

    // Shutdown server
    new Homey.FlowCardAction('shutdown').register()
      .registerRunListener(async (args) => {
        return args.device.shutdown();
      });
  }

}

module.exports = NZBDriver;
