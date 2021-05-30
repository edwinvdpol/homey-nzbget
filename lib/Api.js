'use strict';

const fetch = require('node-fetch');
const AbortController = require('abort-controller');

class Api {

  constructor({ homey }) {
    if (!this.homey) {
      this.homey = homey;
    }
  }

  /**
   * Make a API call.
   */
  async call(method, data, params = []) {
    // Remove trailing slash
    if (data.host.slice(-1) === '/') {
      data.host = data.host.slice(0, -1);
    }

    const fullUrl = `${data.host}:${data.port}/jsonrpc`;

    this.homey.log('Requested POST', fullUrl, method, params);

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000);

    try {
      const res = await fetch(fullUrl, {
        method: 'POST',
        body: JSON.stringify({
          id: 1, method, params, jsonrpc: '2.0',
        }),
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${Buffer.from(`${data.user}:${data.pass}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Check HTTP response
      await this.checkStatus(res);

      const json = await res.json();

      // Check for error in response
      await this.checkError(json);

      return json.result;
    } catch (err) {
      return this.handleError(err);
    } finally {
      clearTimeout(timeout);
    }
  }

  checkError = json => {
    if (json.error) {
      this.homey.error('JSON error', JSON.stringify(json.error));
      throw new Error(this.homey.__('api.badRequest'));
    }
  }

  checkStatus = res => {
    if (res.ok) {
      return res;
    }

    if (res.status === 400) {
      this.homey.error('Bad request', JSON.stringify(res));
      throw new Error(this.homey.__('api.badRequest'));
    }

    if (res.status === 401) {
      this.homey.error('Unauthorized', JSON.stringify(res));
      throw new Error(this.homey.__('api.unauthorized'));
    }

    if (res.status === 502 || res.status === 504) {
      this.homey.error('Timeout', JSON.stringify(res));
      throw new Error(this.homey.__('api.timeout'));
    }

    if (res.status === 500) {
      this.homey.error('Server error', JSON.stringify(res));
      throw new Error(this.homey.__('api.error'));
    }

    this.homey.error('Unknown error', JSON.stringify(res));
    throw new Error(this.homey.__('api.connection'));
  }

  handleError = err => {
    this.homey.error(err);

    if (err.type === 'system') {
      throw new Error(this.homey.__('api.connection'));
    }

    if (err.type === 'aborted') {
      throw new Error(this.homey.__('api.timeout'));
    }

    throw new Error(err.message);
  }

}

module.exports = Api;
