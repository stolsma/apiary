/**
 * Service Runtime Environment Controller startup WRAP
 *
 * Copyright 2012 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
    haibu = require('haibu'),
    appApi = require('./api/app');

/**
 * Create the httproxy System Service with communication channel
 */
require('../../core/service')({
  // Function to execute when the event communication channel is ready
  ready: function() {
    // catch SIGINT...
    process.on('SIGINT', function () {
      console.log('SIGINT event raised in SREC...');
      process.exit(0);
    });
  },

  // Function to execute when the parent asks us to start
  start: function(options, cb) {
    // put the needed code fixes to haibu
    require('./haibufix')(haibu);

    // Store a reference to the original `haibu.emit` function
    // Overwrite `haibu.emit` to lazily add a listener to any 
    // event
    var _emit = haibu.emit;
    haibu.emit = function (ev, level, msg, meta) {
      process.parent.emit('haibu-ev::' + ev, [msg, meta]);
      _emit.apply(haibu, arguments);
    };

    // initialize an extra plugin for haibu
    haibu.use(require('./srecplugin'));

    // Define all options for Haibu. For example create all directories that will be used
    haibu.root = path.join(process.env.HOME, options.directory || 'data');
    var haibuOptions = {
      env: options.env || {},
      directories: {
        apps: '#ROOT/local',
        autostart: '#ROOT/autostart',
        config: '#ROOT/config',
        packages: '#ROOT/packages',
        tmp: '#ROOT/tmp'
      }
    };

    function haibuReady(err, running) {
      if (err) return process.parent.emit('child::startuperror', { err: err, running: running });

      // start the internal API
      appApi.start(process.parent, running.drone);

      // indicate to the parent that we are running!!
      cb('SREC ' + options.name + ' is running!!!');
    }

    function startDrone() {
      haibu.running.server = {close: function(){}}; // just put a dummy server for clean exit...
      haibu.running.drone  = new haibu.drone.Drone(haibuOptions);
      haibu.running.ports  = {};

      return haibuReady(null, haibu.running);
    }

    // Indicate that `haibu.drone` has started
    haibu.drone.started = true;

    // Start the haibu startup sequence
    haibu.init(haibuOptions, startDrone);
  },

  // Actions to execute when the parent asks us to stop
  stop: function(cb) {
    // stop the app API
    appApi.stop(process.parent);

    // and stop Haibu
    haibu.drone.stop(function() {
      // tell the parent I'm in a save state
      cb('Data??');
    });
  }
});