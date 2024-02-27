'use strict';

const fetch = require('node-fetch');
const AbortController = require('abort-controller');

class Client {

  // Constructor
  constructor(store) {
    const {
      host, port, user, pass,
    } = store;

    this.controller = new AbortController();
    this.url = `${host}:${port}/jsonrpc`;

    this.options = {
      method: 'POST',
      signal: this.controller.signal,
      headers: {
        Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
      id: 1, method, params, jsonrpc: '2.0',
    });

    return fetch(this.url, this.options)
      .then(this.responseCheck)
      .then((res) => res.json())
      .then(this.contentCheck)
      .catch((err) => {
        return this.handleError(err);
      })
      .finally(() => {
        clearTimeout(timeout);
      });
  }

  // Check for error in response
  contentCheck = (json) => {
    if (json.error) {
      console.log('[API] NZB error:', JSON.stringify(json));

      throw new Error(json.error.message || 'errors.400');
    }

    return json.result;
  };

  // Check response status
  responseCheck = (res) => {
    if (res.ok) {
      return res;
    }

    console.log(`[API] HTTP error ${res.status}:`, JSON.stringify(res));

    // Client errors
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new Error(`errors.${res.status}`);
    }

    // Internal server error
    if (res.status >= 500 && res.status < 600) {
      throw new Error('errors.50x');
    }

    throw new Error('errors.unknown');
  };

  // Handle connection errors
  handleError = (err) => {
    if (err.type !== 'system' && err.type !== 'aborted') {
      throw err;
    }

    console.log('[API] Error:', err.message);

    if (err.type === 'system') {
      throw new Error('errors.network');
    }

    if (err.type === 'aborted') {
      throw new Error('errors.network');
    }

    throw err;
  };

}

module.exports = Client;
