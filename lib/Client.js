'use strict';

const fetch = require('node-fetch');
const AbortController = require('abort-controller');

class Client {

  // Constructor
  constructor(settings) {
    let {host, port, user, pass} = settings;

    // Remove trailing slash
    if (host.slice(-1) === '/') {
      host = host.slice(0, -1);
    }

    this.controller = new AbortController();
    this.url = `${host}:${port}/jsonrpc`;

    this.options = {
      method: 'POST',
      signal: this.controller.signal,
      headers: {
        Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };
  }

  // Return device information
  async getSyncData() {
    const result = await this.call('status');
    result.Files = await this.call('listfiles');

    return result;
  }

  // Make an API call
  async call(method, params = []) {
    const timeout = setTimeout(() => {
      this.controller.abort();
    }, 5000);

    this.options.body = JSON.stringify({
      id: 1, method, params, jsonrpc: '2.0'
    });

    return fetch(this.url, this.options)
      .then(this.responseCheck)
      .then(res => res.json())
      .then(this.contentCheck)
      .catch(err => {
        throw this.handleError(err);
      }).finally(() => {
        clearTimeout(timeout);
      });
  }

  // Check for error in response
  contentCheck = json => {
    if (json.error) {
      console.log('[API] NZB error:', JSON.stringify(json));
      throw new Error('api.badRequest');
    }

    return json.result;
  };

  // Check response status
  responseCheck = res => {
    if (res.ok) {
      return res;
    }

    console.log(`[API] HTTP error ${res.status}:`, JSON.stringify(res));

    if (res.status === 400) {
      throw new Error('api.badRequest');
    }

    if (res.status === 401) {
      throw new Error('api.unauthorized');
    }

    if (res.status === 502 || res.status === 504) {
      throw new Error('api.timeout');
    }

    if (res.status === 500) {
      throw new Error('api.error');
    }

    throw new Error('api.connection');
  };

  // Handle connection errors
  handleError = err => {
    if (err.type !== 'system' && err.type !== 'aborted') {
      return err;
    }

    console.log('[API] Error:', err.message);

    if (err.type === 'system') {
      return new Error('api.connection');
    }

    if (err.type === 'aborted') {
      return new Error('api.timeout');
    }

    return err;
  };

}

module.exports = Client;
