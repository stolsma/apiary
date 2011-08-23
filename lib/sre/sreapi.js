/**
 * Service Runtime Environment API, a haibu-carapace plugin!
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	appApi = require('./api/app');

// define haibu constants
var	env = 'development',
	root =  path.join(process.env.HOME, 'data'); // provisionary steps for starting haibu for this user
	port = 9002,
	logger = true;

module.exports = function(carapace) {
	// catch SIGINT...
	process.on('SIGINT', function () {
		console.log('SIGINT in SRE ' + carapace.name + ' called...');
		process.exit(0);
	});
	
	// haibu-carapace plugin initialisation function called when haibu-carapace is ready to init plugins
	// argv are the arguments for this plugin given via --plugin, next can be called with error value if error.
	carapace.sreapi = function (argv, next) {
		// do nothing, just call next plugin, if any...
		return next ? next() : null;
	};
	
	carapace.onAny(function () {
//			console.log('Carapace event: ', this.event, arguments)
	});
	
	// only start haibu when carapace is ready and with startup data from apiary!!
	carapace.once('*::sre::start', function(data) {
		// haibu module is initialized by srewrap, so get it.
		var haibu = carapace._module.exports;

		// initialize an extra plugin for haibu
		haibu.use(require('./sreplugin'));

		// create all directories that will be used
		haibu.config.set('directories', {
			apps: path.join(root, 'local'),
			autostart: path.join(root, 'autostart'),
			packages: path.join(root, 'packages'),
			tmp: path.join(root, 'tmp'),
		});

		var options = {
			env: env,
			port: port,
			host: '127.0.0.1',
			hook: {
				'hook-name': carapace.name + '_haibu',
				'hook-host': 'localhost',
				'hook-port': data['haibu-hook-port']
			}
		};

		haibu.drone.start(options, function () {
			if (logger) {
				haibu.use(haibu.plugins.logger);
			}
			
			// bridge important haibu hook.io events to System Controller (SC)
			haibu.running.hook.onAny(function(data) {
				carapace.emit('haibu-io::' + this.event, data)
			});

			// start the app API
			appApi.start(carapace, haibu);
			
			data.ready();
		});
	});
	
	carapace.on('*::sre::stop', function(stopReady) {
		// haibu module is initialized by srewrap, so get it.
		var haibu = carapace._module.exports;
		
		// stop the app API
		appApi.stop(carapace);
		
		// and stop Haibu
		haibu.drone.stop(function() {
			stopReady();
		});
	});
};