/**
 * Service Runtime Environment API
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path');

module.exports = function(carapace) {
	// define haibu for later use
	var haibu;
	
	if (!carapace.sreapi) {
		carapace.sreapi = function (value, next) {
			return next ? next() : null;
		};
		
		carapace.onAny(function () {
//			console.log('Carapace event: ', this.event, arguments)
		});
		
		carapace.once('*::srec::start', function(data) {
			console.log('*::srec::start event recorded!!')
				env = 'development',
				root =  path.join(process.env.HOME, 'data'); // provisionary steps for starting haibu for this user
				port = 9002,
				logger = true;
			
			// haibu module is initialized by srewrap, so get it.
			haibu = require('haibu');

			haibu.utils.bin.getAddress(undefined, function (err, address) {
				if (err) {
					console.log('Error getting IP Address: ' + err.message);
				}
				
				// create all directories that will be used
				haibu.config.set('directories', {
					apps: path.join(root, 'local'),
					autostart: path.join(root, 'autostart'),
					packages: path.join(root, 'packages'),
					tmp: path.join(root, 'tmp')
				});
	
				var options = {
					env: env,
					port: port,
					host: address,
				};
				
				haibu.drone.start(options, function () {
					if (logger) {
						haibu.use(haibu.plugins.logger);
					}
					
					console.log('Running: ', haibu.running);
					
					haibu.running.drone  = new haibu.drone.Drone(options);
					haibu.running.ports  = {};
					
					data.ready();
				});
			});

		});
		
		carapace.on('*::srec::startapp', function(data) {
			console.log('*::srec::startapp event recorded!!');
			
			// start App
			haibu.running.drone.start(data.app, function (err, result) {
				if (err) {
					data.ready(err, null);
				} else {
					data.ready(null, result.drone);
				}
			});
		});
	}  
};

/**

var sreApi = exports;

// Name this plugin so it can be accessed by name
sreApi.name = 'sreapi';

//
// ### function init (options, callback) 
// #### @options {Object} Options to initialize this plugin with
// #### @callback {function} Continuation to respond to when complete
//
sreApi.init = function (options, callback) {
	options = options || {};
	callback = callback || function () { };
	
	callback();
};

var path = require('path'),
	fs = require('fs'),
	inherits = require('util').inherits,
	Hook = require('hook.io').Hook,
	haibu = require('haibu');

// plug haibu with required extra functions for apiary
fs.readdirSync(__dirname + '/plugin').forEach(function (plugin) {
	plugin = plugin.replace('.js', '');
    plugin = require('./plugin/' + plugin);
	haibu.activePlugins[plugin.name] = plugin;
});

SreApi.prototype.RPC_startHaibu = function(env, cb) {
	var self = this,
		root = this.root = path.join(process.env.HOME, 'data'); // provisionary steps for starting haibu for this user
		options = {
			env: env,  // haibu environment to start in 'Development' for example
			config: {}
		},
	
	// create all directories that will be used
	haibu.config.set('directories', {
		apps: path.join(root, 'local'),
		autostart: path.join(root, 'autostart'),
 		packages: path.join(root, 'packages'),
		tmp: path.join(root, 'tmp')
	});
	
	haibu.init(options, function(){
		// create drone controller
		self.haibu = new haibu.drone.Drone(options);
		// start logger
		haibu.use(haibu.plugins.logger);
		// Klaar!!
		cb();
	})
};
	
SreApi.prototype.RPC_startApp = function(app, port, cb) {
	// check if Haibu is started
	if (!this.haibu) return cb(new Error('SRE Controller not started yet!!'))
	
	// TODO: solve workaround for port selection
	app.port = port;
	
	// start App
	this.haibu.start(app, function (err, result) {
		if (err) {
			cb(err, null);
		} else {
			cb(null, result.drone);
		}
	});
};

SreApi.prototype.RPC_stopApp = function(app, cb) {
	// check if Haibu is started
	if (!this.haibu) return cb(new Error('SRE Controller not started yet!!'))
	
	// stop App
	this.haibu.stop(app.name, function (err, result) {
		if (err) {
			cb(err, null);
		} else {
			cb(null, result.drone);
		}
	});
};

SreApi.prototype.RPC_restartApp = function(app, cb) {
	// check if Haibu is started
	if (!this.haibu) return cb(new Error('SRE Controller not started yet!!'))
	
	// restart App
	this.haibu.restart(app.name, function (err, result) {
		if (err) {
			cb(err, null);
		} else {
			cb(null, result.drone);
		}
	});
};

SreApi.prototype.RPC_cleanApp = function(app, cb) {
	// check if Haibu is started
	if (!this.haibu) return cb(new Error('SRE Controller not started yet!!'))
	
	// clean App
	this.haibu.clean(app, function (err, result) {
		if (err) {
			cb(err, null);
		} else {
			cb(null, result.drone);
		}
	});
};

SreApi.prototype.RPC_updateApp = function(app, cb) {
	// check if Haibu is started
	if (!this.haibu) return cb(new Error('SRE Controller not started yet!!'))
	
	// update App
	this.haibu.update(app, function (err, result) {
		if (err) {
			cb(err, null);
		} else {
			cb(null, result.drone);
		}
	});
};

SreApi.prototype.RPC_showApp = function(app, cb) {
	// check if Haibu is started
	if (!this.haibu) return cb(new Error('SRE Controller not started yet!!'))
	
	// show App info
	cb(this.haibu.show(app.name));
};

SreApi.prototype.RPC_listApps = function(cb) {
	// check if Haibu is started
	if (!this.haibu) return cb(new Error('SRE Controller not started yet!!'))
	
	// show App info
	cb(this.haibu.list());
};

*/