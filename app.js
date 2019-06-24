'use strict';

const Homey = require('homey');

class NZBApp extends Homey.App {

    /*
    |---------------------------------------------------------------------------
    | Initiate
    |---------------------------------------------------------------------------
    |
    | This method is called upon initialization of this application.
    |
    */

    onInit () {
        console.log('✓ NZBGet App running');
    }

};

module.exports = NZBApp;
