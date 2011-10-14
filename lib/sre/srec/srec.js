/**
 * Service Runtime Environment Controller startup WRAP
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	Parent = require('intercom').Parent;
	haibu = require('haibu');
	appApi = require('./api/app');

var parent = Parent(function() {
	// catch SIGINT...
	process.on('SIGINT', function () {
		console.log('SIGINT event raised in SREC...');
		process.exit(0);
	});
	
	// only start haibu when event comms channel is ready and with startup data from apiary!!
	parent.once('child::start', function(data, cbEvent) {
		// put the needed code fixes to haibu
		require('./haibufix')(haibu);

		// Store a reference to the original `haibu.emit` function
		// Overwrite `haibu.emit` to lazily add a listener to any 
		// event
		var _emit = haibu.emit;
		haibu.emit = function (ev, level, msg, meta) {
			parent.emit('haibu-ev::' + ev, [msg, meta]);
			_emit.apply(haibu, arguments);
		}
		
		// initialize an extra plugin for haibu
		haibu.use(require('./srecplugin'));

		// create all directories that will be used
		var root = path.join(process.env.HOME, data.directory || 'data');
		haibu.config.set('directories', {
			apps: path.join(root, 'local'),
			autostart: path.join(root, 'autostart'),
			packages: path.join(root, 'packages'),
			tmp: path.join(root, 'tmp'),
		});

		var options = {
			env: data.env,
			port: data.port,
			host: '127.0.0.1',
			hook: {
				'hook-name': data.name + '_haibu',
				'hook-host': '127.0.0.1',
				'hook-port': data['haibu-hook-port']
			}
		};

		function haibuReady(err, running) {
			if (err) return parent.emit('child::startuperror', { err: err, running: running });
			
			// bridge important haibu hook.io events to System Controller (SC)
			running.hook.onAny(function(data) {
				parent.emit('haibu-io::' + this.event, data)
			});

			// start the internal API
			appApi.start(parent, running.drone);

			// indicate to the parent that we are running!!
			parent.emit(cbEvent);
		}

		function autoStart(err, running) {
			if (err) return haibuReady(err);

			haibu.drone.autostart(running, function (err) {
				haibuReady(err, running);
			})
		}

		function startDrone(err, hook) {
			if (err) return haibuReady(err);
			
			haibu.running.server = {close: function(){}};           // just put a dummy server for clean exit...
			haibu.running.drone  = new haibu.drone.Drone(options);
			haibu.running.ports  = {};

			return haibuReady(null, haibu.running);
		}
		
		function startHook() {
			return haibu.drone.startHook(options.hook, startDrone);
		}
		
		// Indicate that `haibu.drone` has started
		haibu.drone.started = true;

		// Start the haibu startup sequence		
		startHook();
	});
	
	// Actions to execute when the parent asks us to stop
	parent.on('child::stop', function(cbEvent) {
		// stop the app API
		appApi.stop(parent);
		
		// and stop Haibu
		haibu.drone.stop(function() {
			// tell the parent I'm in a save state
			parent.emit(cbEvent, 'Data??');
		});
	});
});