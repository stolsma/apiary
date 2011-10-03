/**
* service.js: Standard service class for Apiary service and controller processes
* with RPC communication over internal nodejs fork communication channel
*
* Copyright 2011 TTC/Sander Tolsma
* See LICENSE file for license
*/

var inherits = require('util').inherits,
	EventEmitter = require('eventemitter2').EventEmitter2,
	forkChild = require('node-fork').forkChild,
	rpc = require('./rpc');

// eventEmitter2 and comms constants
var EVENT_OPTIONS = {
		delimiter: '::',
		childDelimiter: 'parent',
		wildcard: true
	};

var Service = module.exports = function(startupFn, options) {
	// if called as function return Instance
	if (!(this instanceof Service)) return new Service(startupFn, options);

	// Setup basic configuration options
	options           = options || {};
	this.eventOptions = options.eventOptions || EVENT_OPTIONS;

	// Call the parent EventEmitter2 constructor
	EventEmitter.call(this, this.eventOptions);

	// create inband communication channel with the parent
	forkChild();

	// setup rpc connection with parent
	rpc(this, process, this.eventOptions);

	this.once('rpcready', startupFn.bind(this));
};
// Inherit from EventEmitter2
inherits(Service, EventEmitter);