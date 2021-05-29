'use strict';

const fetch = require('node-fetch');
const AbortController = require('abort-controller');

const controller = new AbortController();

class Api {

  constructor(data, homey) {
    if (!this.homey) {
      this.homey = homey;
    }

    this.host = data.host || 'http://127.0.0.1';
    this.user = data.user || 'nzbget';
    this.pass = data.pass || 'tegbzn6789';
    this.port = data.port || 6789;
  }

  /**
   * Request for file’s list of a group.
   *
   * @param {number} id
   * @returns Promise<object>
   */
  async listfiles(id = 0) {
    if (id) {
      return this.call('listfiles', [0, 0, id]);
    }

    return this.call('listfiles');
  }

  /**
   * Pause download queue.
   *
   * @returns {Promise<boolean>}
   */
  async pausedownload() {
    return this.call('pausedownload');
  }

  /**
   * Set download speed limit in MB/second.
   *
   * Value 0 disables speed throttling.
   *
   * @param {number} limit
   * @returns {Promise<boolean>}
   */
  async rate(limit = 0) {
    // KB/s => MB/s
    limit = Number(limit * 1000);

    return this.call('rate', [limit]);
  }

  /**
   * Reload.
   *
   * @returns {Promise<boolean>}
   */
  async reload() {
    return this.call('reload');
  }

  /**
   * Resume (previously paused) download queue.
   *
   * @returns {Promise<boolean>}
   */
  async resumedownload() {
    return this.call('resumedownload');
  }

  /**
   * Request rescanning of incoming directory for nzb-files.
   *
   * @returns Promise<boolean>
   */
  async scan() {
    return this.call('scan');
  }

  /**
   * Shutdown.
   *
   * @returns Promise<boolean>
   */
  async shutdown() {
    return this.call('shutdown');
  }

  /**
   * Status.
   *
   * @returns Promise<object>
   */
  async status() {
    return this.call('status');
  }

  /**
   * Get version.
   *
   * @returns {Promise<string>}
   */
  async version() {
    return this.call('version');
  }

  /**
   * Make a API call.
   */
  async call(method, params = []) {
    const fullUrl = `${this.host}:${this.port}/jsonrpc`;

    this.homey.log('Requested POST', fullUrl, method, params);

    const timeout = this.homey.setTimeout(() => {
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
          Authorization: `Basic ${Buffer.from(`${this.user}:${this.pass}`).toString('base64')}`,
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
      this.homey.clearTimeout(timeout);
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
