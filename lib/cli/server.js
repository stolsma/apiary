/**
 * server.js: API Server for the Apiary CLI.
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var path = require('path'),
    dnode  = require('dnode');

/**
 * The CLi Server class definition
 * @class CliServer
 *
 * @constructor
 * Create CLI Server class
 * @param {Object} options CliServer config options:
 * @param {Sc} sc The System Controller to send the Events to
 */
var CliServer = module.exports = function(options, sc) {
	// if called as function return Instance
	if (!(this instanceof CliServer)) return new CliServer(options);

	if (!sc) throw('No System Controller given to the CLI Server constructor');
	this.sc = sc;
	
	// set default options
	options = options || {};
	this.socket = options.cliSocket || null;
}

/**
 * Attempts to spawn the CLI server for this instance. 
 * @param {function} cb Continuation to respond to when complete
 */
CliServer.prototype.listen = function (cb) { 
	cb = cb || function() {};
	if (!this.socket) return cb(new Error('No socket found!!'));

	var self = this,
		sc = this.sc;
		
	this.listening = true;

	this.server = dnode(function (client, conn) {
		sc.emit('cliserver::connected', client.name);
		// start building the API
		this.test = self.test.bind(self);
		this.getServerpid = self.getServerPid.bind(self);
	});
	  
	this.server.on('connection', function (conn) {
		sc.emit('cliserver::open', conn);
	});

	this.server.on('ready', function () {
		cb(null);
	});
	
	try {
		this.server.listen(this.socket);
	}
	catch (ex) {
		return cb(ex);
	}
}

CliServer.prototype.test = function(data) {
	this.sc.emit('cliserver::test', data);
}

CliServer.prototype.getServerPid = function(cb) {
	cb(process.pid);
}