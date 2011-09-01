/**
 * server.js: API Server for the Apiary CLI.
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var dnode = require('dnode');

/**
 * The Cli Server class definition
 * @class CliServer
 *
 * @constructor
 * Create CLI Server class
 * @param {Apiary} apiary The Apiary system to connect to
 * @param {Object} options (optional) CliServer config options:
 */
var CliServer = module.exports = function(apiary, options) {
	// if called as function return Instance
	if (!(this instanceof CliServer)) return new CliServer(apiary, options);

	// set default options
	options = options || {};
	this.socket = options.cliSocket || null;
	
	// set the Apiary System to talk with	
	this.apiary = apiary;
}

/**
 * Attempts to spawn the CLI server for this instance. 
 * @param {String} socket (optional) Socket to connect to
 * @param {Function} cb Continuation function to respond to when complete
 * @return {CliServer} This cliServer instance, makes linking possible
 */
CliServer.prototype.listen = function (socket, cb) {
	if (typeof(socket) == 'function') {
		cb = socket;
		socket = undefined;
	}
	cb = cb || function() {};

	var self = this,
		apiary = this.apiary;
		
	this.listening = true;

	this.server = dnode(function (client, conn) {
		apiary.emit('cliserver::connected', client);

		// start building the API
		this.getServerPid = self.getServerPid.bind(self);
		this.appClean = self.appClean.bind(self);
		this.appStart = self.appStart.bind(self);
		this.appStop = self.appStop.bind(self);
		this.appList = self.appList.bind(self);
	});

	this.server.on('connection', function (conn) {
		apiary.emit('cliserver::open', conn);
	});

	this.server.on('ready', function () {
		cb();
	});

	try {
		this.server.listen(socket || this.socket);
	}
	catch (ex) {
		cb(ex);
	}
	
	// make continuation possible
	return this;
}

/**
 * (API) Return the running pid to the given callback function
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.getServerPid = function(cb) {
	cb(process.pid);
}

/**
 * (API) Stops and removes (an) application(s) from this Apiary System
 * @param {Object} app Application description
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.appClean = function(app, cb) {
	cb(null, process.pid);
}

/**
 * (API) Start an application on this Apiary System
 * @param {Object} app Application description
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.appStart = function(app, cb) {
	if (this.apiary.sc) {
		this.apiary.sc.startApp(app, cb);
	} else {
		cb(new Error('System Controller not defined!!'));
	}
}

/**
 * (API) Stops an application on this Apiary System
 * @param {Object} app Application description
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.appStop = function(app, cb) {
	if (this.apiary.sc) {
		this.apiary.sc.stopApp(app, cb);
	} else {
		cb(new Error('System Controller not defined!!'));
	}
}

/**
 * (API) Lists all apps running on this Apiary System
 * @param {Object} app Application description
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.appList = function(app, cb) {
	cb(null, process.pid);
}