'use strict';

const Homey = require('homey');
const url = require('url');

class Api extends Homey.SimpleClass {

  /*
  |---------------------------------------------------------------------------
  | Constructor
  |---------------------------------------------------------------------------
  */

  constructor(device_data) {
    super();

    // Defaults
    this.user = device_data.user || 'nzbget';
    this.pass = device_data.pass || 'tegbzn6789';
    this.port = device_data.port || 6789;
    this.url = device_data.url || 'http://127.0.0.1';

    this.auth = this.user + ':' + this.pass;
    this.host = url.parse(this.url).hostname;
    this.agent = this.url.startsWith('https') ? require('https') : require('http');
  }

  /*
  |---------------------------------------------------------------------------
  | Request
  |---------------------------------------------------------------------------
  |
  | This method will fetch and return the result of the NZBGet API.
  |
  */

  request(options) {
    return new Promise((resolve, reject) => {

      options = options || {};

      this.path = options.path || '/jsonrpc';
      this.httpmethod = options.httpmethod || 'POST';

      let requestData = {}, params = [], method = '', jsonrpc = '2.0', id = 1;

      if (options) {
        if (options.hasOwnProperty('method')) {
          method = options.method;
        }
        if (options.hasOwnProperty('params')) {
          params = options.params;
        }
        if (options.hasOwnProperty('jsonrpc')) {
          jsonrpc = options.jsonrpc;
        }
        if (options.hasOwnProperty('id')) {
          id = options.id;
        }
      }

      requestData.id = id;
      requestData.method = method;
      requestData.params = params;
      requestData.jsonrpc = jsonrpc;

      requestData = JSON.stringify(requestData);

      if (this.httpmethod === 'GET') {
        requestData = require('querystring').escape(requestData);
      }

      let requestOptions = {
        host: this.host,
        port: this.port,
        path: this.path,
        agent: this.agent.globalAgent,
        method: this.httpmethod,
        auth: this.auth,
        headers: {
          'content-type': (this.httpmethod === 'POST') ? 'application/x-www-form-urlencoded' : 'application/json',
          'content-length': requestData.length
        }
      };

      if (this.httpmethod === 'GET') {
        requestOptions.path = requestOptions.path + requestData;
      }

      let request = this.agent.request(requestOptions);

      request.on('error', (error) => {
        this.error('HTTP error', error);

        reject(new Error(Homey.__('error.connection')));
      });

      request.on('response', (response) => {
        let buffer = '';

        response.on('data', (bytes) => {
          buffer += bytes;
        });

        response.on('end', () => {
          let result;

          if (response.statusCode === 401) {
            reject(new Error(Homey.__('error.login')));
          } else if (response.statusCode === 403) {
            reject(new Error(Homey.__('error.access')));
          } else if (response.statusCode === 500) {
            reject(new Error(Homey.__('error.internal')));
          } else if (response.statusCode === 200 || response.statusCode === 304) {
            if (buffer.length > 0) {
              try {
                result = JSON.parse(buffer);

                if (result.error) {
                  console.log(result);
                  reject(new Error(result.error.message));
                } else if (!result.result) {
                  console.log(result);
                  reject(new Error(Homey.__('error.unknown')));
                }
              } catch (error) {
                console.log(error);
                reject(new Error(`JSON error:` + error));
              }
            }
          } else {
            reject(new Error(`${Homey.__('error.unknown')}: ${response.statusCode}`));
          }

          resolve(result);
        });
      });

      if (this.httpmethod === 'POST') {
        request.write(requestData);
      }

      request.end();
    });
  }

}

module.exports = Api;
