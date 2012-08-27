/**
 * Service Runtime Environment Controller startup WRAP
 *
 * Copyright 2011 TTC/Sander Tolsma
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
		}
		
		// initialize an extra plugin for haibu
		haibu.use(require('./srecplugin'));

		// create all directories that will be used
		var root = path.join(process.env.HOME, options.directory || 'data');
		haibu.config.set('directories', {
			apps: path.join(root, 'local'),
			autostart: path.join(root, 'autostart'),
			packages: path.join(root, 'packages'),
			tmp: path.join(root, 'tmp'),
		});

		var haibuOptions = {
			env: options.env
		};

		function haibuReady(err, running) {
			if (err) return process.parent.emit('child::startuperror', { err: err, running: running });
			
			// bridge important haibu hook.io events to System Controller (SC)
//			running.hook.onAny(function(data) {
//				process.parent.emit('haibu-io::' + this.event, data)
//			});

			// start the internal API
			appApi.start(process.parent, running.drone);

			// indicate to the parent that we are running!!
			cb('SREC ' + options.name + ' is running!!!');
		}

		function autoStart(err, running) {
			if (err) return haibuReady(err);

			haibu.drone.autostart(running, function (err) {
				haibuReady(err, running);
			})
		}

		function startDrone() {
		
			haibu.running.server = {close: function(){}};           // just put a dummy server for clean exit...
			haibu.running.drone  = new haibu.drone.Drone(haibuOptions);
			haibu.running.ports  = {};

			return haibuReady(null, haibu.running);
		}
		
		// Indicate that `haibu.drone` has started
		haibu.drone.started = true;

		// Start the haibu startup sequence		
		startDrone();
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