/**
 * client.js: API Client for the Apiary CLI.
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var inherits = require('util').inherits,
	EventEmitter2 = require('eventemitter2').EventEmitter2,
    dnode = require('dnode');
	
/**
 * The Cli Client class definition
 * @class CliClient
 * @extends EventEmitter2
 *
 * @constructor
 * Create CLI Client class
 * @param {Object} options CliClient config options:
 */
var CliClient = module.exports = function(options) {
	// if called as function return Instance
	if (!(this instanceof CliClient)) return new CliClient(options);

	// set default options
	options = options || {};
	this.socket = options.cliSocket || null;
	
	// not connected yet!!
	this.connected = false;
}
inherits(CliClient, EventEmitter2);

/**
 * Connect to the given CLI Socket 
 * @param {String} socket (optional) Socket to connect to
 */
CliClient.prototype.connect = function(socket) {
	var self = this;
	
	// check arguments
	if (typeof(socket) == 'function') {
		cb = socket;
		socket = this.socket || null;
	}
	
	// Connect to the CLI server on the given socket
	this.client = dnode.connect(socket, function (remote, conn) {
		// add connection listening events
		conn.on('end', function end() {
			conn.removeListener('end', end);
			self.remote = null;
			self.connected = false;
			self.emit('disconnected');
		});

		// Save remote CLI API functions, set to connected and emit 'connected' event
		self.remote = remote;
		self.connected = true;
		self.emit('connected', remote);
	});
	
	// relay error events
	this.client.on('error', function (err) {
		self.emit('error', err);
	})
	
	return this;
}

/**
 *
 */
CliClient.prototype.start = function() {
}