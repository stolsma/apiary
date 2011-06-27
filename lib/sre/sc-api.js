/**
 * haibu startup wrapper module
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	haibu = require('haibu'),
	internalRPC = require('../comms/internal');

// provisionary steps for starting haibu for this user
var root = path.join(process.env.HOME, 'data'),
	drone = null,
	env = 'development',
	logger = true,
	address = '127.0.0.1';

haibu.config.set('directories', {
	apps: path.join(root, 'local'),
	log: path.join(root, 'log'),
	packages: path.join(root, 'packages'),
	running: path.join(root, 'running'),
	tmp: path.join(root, 'tmp')
});

haibu.config.set('npm', {
	log: path.join(root, 'log', 'npm.log'),
	out: path.join(root, 'log', 'npm.out')
});

// define our RPC interface to parent
function start(parent, RPCsession) {
	this.startAPI = function(port, cb) {
		console.log('Parent send port: ' + port);

		if (port) {
			haibu.utils.bin.getAddress(address, function (err, address) {
				if (err) {
					console.log('Error getting IP Address: ' + err.message);
					process.exit(1);
				}
			  
				var options = {
					env: env,
					port: port,
					host: address,
					config: {}
				};
				
				haibu.drone.start(options, function () {
					if (logger) {
						haibu.use(haibu.plugins.logger);
					}
				});
			});
			// send ok back
			cb('ok');
		} else
			// send nok back
			cb('nok');
	};
	
	this.startHaibu = function(cb) {
		var options = {
			env: env,
			config: {}
		};
		haibu.init(options, function(){
			// create drone controller
			drone = new haibu.drone.Drone(options);
			// and create logger
			haibu.use(haibu.plugins.logger);
			// Klaar!!
			cb();
		})
	};
	
	this.startApp = function(app, cb) {
		drone.start(app, function (err, result) {
			if (err) {
				cb(err);
			} else {
				cb(result.drone);
			}
		});
	};
};

// connect to the parent and wait until we receive RPC functions from the parent
function parentRPC(parent, RPCsession) {
	// function to show how bidirectional comms can be created
	parent.request('Test request', function(msg) {
		// process the returned data, in this case msg
	});
};

// Startup RPC connection with the parent and put the resulting session object in the main module exports
exports.RPCsession = internalRPC(process, start, parentRPC);
	