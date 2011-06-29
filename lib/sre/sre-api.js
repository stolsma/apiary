/**
 * Service Runtime Environment API
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	inherits = require('util').inherits,
	EventEmitter = require('events').EventEmitter,
	haibu = require('haibu'),
	rpcProtocol = require('../comms/internal');

// Functions prepended with this string are communicated as RPC calls to parent System Controller
var rpcId = 'RPC_';

/**
 * Create Service Runtime Environment Controller API
 * @constructor
 */
var SreApi = module.exports = function () {
	// Startup RPC connection with the parent and put the resulting session object in the main module exports
	this.rpcSession = rpcProtocol(process, this.createRpcApi.bind(null, this), this.parentReady.bind(this));
};
inherits(SreApi, EventEmitter);

/**
 * Connect to the parent and wait until we receive RPC functions from the parent
 */
SreApi.prototype.parentReady = function(parentFn, conn) {
	// function to show how bidirectional comms can be created
	parentFn.request('Test request', function(answer) {
		console.log('Test request answer :' + answer);
	});
};

/**
 * Bind functions starting with rpcId given in instance to the 'this' Object
 * @instance {Sre}
 * @parentRpc {Object}
 * @conn {}  
 */
SreApi.prototype.createRpcApi = function(instance, parentRpc, conn) {
	// save RPC interface
	this.parentRpc = parentRpc;
	
	// iterate over all properties and see if there are functions starting with rpcId
	for (var prop in instance) { 
		// Is this propery a function and starting with rpcId string?
		if ((typeof instance[prop] == 'function') && (prop.indexOf(rpcId) == 0)) {
			// define the function in the API object without rpcId prefix and bind it to the instance scope when called
			this[prop.slice(rpcId.length)] = instance[prop].bind(instance);
		}
	}
}

SreApi.prototype.RPC_startHaibu = function(env, cb) {
	var self = this,
		root = this.root = path.join(process.env.HOME, 'data'); // provisionary steps for starting haibu for this user
		options = {
			env: env,
			config: {}
		},
	
	// create all directories that will be used
	haibu.config.set('directories', {
		apps: path.join(root, 'local'),
		log: path.join(root, 'log'),
		packages: path.join(root, 'packages'),
		running: path.join(root, 'running'),
		tmp: path.join(root, 'tmp')
	});
	
	// set NPM log locations
	haibu.config.set('npm', {
		log: path.join(root, 'log', 'npm.log'),
		out: path.join(root, 'log', 'npm.out')
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
	if (!this.haibu) cb(new Error('Haibu not started yet!!'))
	
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
