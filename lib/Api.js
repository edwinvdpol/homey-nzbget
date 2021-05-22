'use strict';

const { SimpleClass, Homey } = require('homey');

const url = require('url');

class Api extends SimpleClass {

    /*
    |---------------------------------------------------------------------------
    | Constructor
    |---------------------------------------------------------------------------
    */

    constructor (device_data) {
        super();

        // Defaults
        this.user = device_data.user || 'nzbget';
        this.pass = device_data.pass || 'tegbzn6789';
        this.port = device_data.port || 6789;
        this.url  = device_data.url  || 'http://127.0.0.1';

        var urlObj = url.parse(this.url);

        this.auth = this.user + ':' + this.pass;
        this.host = urlObj.hostname;
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

    request (options) {
        return new Promise((resolve, reject) => {

            options = options || {};

            this.path = options.path || '/jsonrpc';
            this.httpmethod = options.httpmethod || 'POST';

            var requestData = {}, params = [], method = '', jsonrpc = '2.0', id = this._getRandomId();

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

            var requestOptions = {
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

            var request = this.agent.request(requestOptions);

            request.on('error', (error) => {
                this.error('HTTP error', error);

                reject(new Error(Homey.__('error.connection')));
            });

            request.on('response', (response) => {
                var buffer = '';

                response.on('data', (bytes) => {
                    buffer += bytes;
                });

                response.on('end', () => {
                    var result;
                    var data = buffer;

                    if (response.statusCode === 401) {
                        reject(new Error(Homey.__('error.login')));
                    }
                    else if (response.statusCode === 403) {
                        reject(new Error(Homey.__('error.access')));
                    }
                    else if (response.statusCode === 500) {
                        reject(new Error(Homey.__('error.internal')));
                    }
                    else if (response.statusCode === 200 || response.statusCode === 304) {
                        if (data.length > 0) {
                            try {
                                result = JSON.parse(data);

                                if (result.error) {
                                    this.error(result);
                                    reject(new Error(result.error.message));
                                }
                                else if (!result.result) {
                                    this.error(result);
                                    reject(new Error(Homey.__('error.unknown')));
                                }
                            } catch (error) {
                                this.error(error);
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

    /*
    |---------------------------------------------------------------------------
    | getRandomId
    |---------------------------------------------------------------------------
    |
    | This method will generate and return a random integer.
    |
    */

    _getRandomId () {
        return parseInt(Math.random() * 100000);
    }

};

module.exports = Api;
