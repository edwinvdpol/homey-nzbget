'use strict';

class Timer {

  // Constructor
  constructor({homey, device}) {
    this.device = device;
    this.homey = homey;
    this.timer = null;
  }

  // Fire sync event
  sync() {
    this.homey.emit('sync', this.device);
  }

  // Start timer
  async start(seconds = null) {
    if (this.timer) {
      return;
    }

    if (!seconds) {
      seconds = this.device.getSetting('refresh_interval');
    }

    this.timer = this.homey.setInterval(this.sync.bind(this), (1000 * seconds));

    this.log(`Started with ${seconds} seconds`);
  }

  // Stop timer
  async stop() {
    if (!this.timer) {
      return;
    }

    this.homey.clearTimeout(this.timer);
    this.timer = null;

    this.log('Stopped');
  }

  /*
  | Log functions
  */

  log() {
    const {id} = this.device.getData();

    this.homey.log(`[Device] [${id}] [Timer]`, ...arguments);
  }
}

module.exports = Timer;
