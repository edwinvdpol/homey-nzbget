'use strict';

const Homey = require('homey');
const superagent = require('superagent');

class Api extends Homey.SimpleClass {

  constructor(data) {
    super();

    this.host = data.host || 'http://192.168.1.30';
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
  async listfiles(id = 0)  {
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
  async scan()  {
    return this.call('scan');
  }

  /**
   * Shutdown.
   *
   * @returns Promise<boolean>
   */
  async shutdown()  {
    return this.call('shutdown');
  }

  /**
   * Status.
   *
   * @returns Promise<object>
   */
  async status()  {
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
    const url = `${this.host}:${this.port}/jsonrpc`;
    const data = this._request(method, params);

    return superagent
      .post(url, JSON.stringify(data))
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .auth(this.user, this.pass)
      .then(res => {
        return this._onSuccess(res);
      }).catch(err => {
        return this._onError(err);
      });
  }

  /**
   * Error handler.
   *
   * @param {object} err
   * @private
   */
  _onError(err) {
    console.log('API error', err);

    throw new Error(Homey.__('api.connection'));
  }

  /**
   * Success handler.
   *
   * @param {object} res
   * @returns {any}
   * @private
   */
  _onSuccess(res) {
    if (res.unauthorized) {
      throw new Error(Homey.__('api.unauthorized'));
    }

    if (res.forbidden) {
      throw new Error(Homey.__('api.forbidden'));
    }

    if (res.error) {
      throw new Error(Homey.__('api.error'));
    }

    if (res.body.error) {
      throw new Error('NZB error: ' + res.body.error.message);
    }

    if (!res.body.result) {
      throw new Error(Homey.__('api.response'));
    }

    return res.body.result;
  }

  /**
   * Return request.
   *
   * @param {string} method
   * @param {object} params
   * @returns {object}
   * @private
   */
  _request(method, params) {
    return {
      id: 1,
      method: method,
      params: params,
      jsonrpc: '2.0'
    };
  }

}

module.exports = Api;
