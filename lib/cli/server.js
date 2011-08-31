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
    dnode = require('dnode');

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
		this.test = self.test.bind(self);
		this.getServerPid = self.getServerPid.bind(self);
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

CliServer.prototype.test = function(data) {
	this.apiary.emit('cliserver::test', data);
}

CliServer.prototype.getServerPid = function(cb) {
	cb(process.pid);
}