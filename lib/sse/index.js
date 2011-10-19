/**
 * A Service System Environment subsystem definition as used by the System Controller. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @module sse
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var path = require('path'),
	inherits = require('util').inherits;

var	apiary = require('../apiary');

/**
 * The System Service Environment class definition used by the System Controller
 * @class Sse
 * @extends Controller
 *
 * @constructor
 * Create System Service Environment subsystem instance
 * @param {Object} Options SSE config options:
 * 	  `uid` {String/Integer} Socket user id, default is -1 (current)
 * 	  `gid` {String/Integer} Socket group id, if not defined the given uid is used, if thats not defined -1 (current)
 */
var Sse = module.exports = function(options) {
	// if called as function return Instance
	if (!(this instanceof Sse)) return new Sse(options);
	
	// set default options
	options = options || {};
	options.name = options.name || 'sse';
	this.uid = options.uid	|| -1;
	this.gid = options.gid	|| -1;
	
	// Call the parent constructor
	Sse.super_.call(this, options);
	
	// fill serviceTypes store with known sse services
	this.serviceAdd('httpproxy', path.join(__dirname, './httpproxy/index.js'));
};
inherits(Sse, apiary.Controller);


/**
 * Start a child System Service process
 * @param {Object} options Object with the following possible configuration options:
 *     `name` {String} The name of the service to start
 *     `type` {String} The System Service type to start
 * 	   `cwd` {String} The current working directory to start the System Service in, default is current process cwd.
 * 	   `uid` {String/Integer} System user uid, default is -1 (current)
 * 	   `gid` {String/Integer} System user gid, if not defined the given uid is used, if thats not defined -1 (current)
 * @param {Function} cb Callback to call when System Service API is running
 */
Sse.prototype.startService = function(options, cb) {
	// set default options
	options = options || {};
	options.uid = options.uid || this.uid;
	options.gid = options.gid || this.gid;
	
	// start the System Service with the given options and callback
	var child = Sse.super_.prototype.startService.call(this, options, cb);

	//
	// TODO: Temporary message passing, needs to be replaced by other
	// mechanism. At this moment only one, two and three deep events are bridged
	//
	function msgBridge() {
		var parts = this.event.split(this.delimiter),
			args = Array.prototype.slice.call(arguments);
		
		// cut child and replace with child name
		parts.splice(0, 1, options.name);
		parts.join(this.delimiter);
		
		// send message through to System Controller
		apiary.emit.apply(apiary, [parts.join(this.delimiter)].concat(args));
	}
	child.on('child::*', msgBridge);
	child.on('child::*::*', msgBridge);
	child.on('child::*::*::*', msgBridge);
	
	return child;
}


/**
 * Log messages from this instance to the logger
 */
Sse.prototype.log = function() {
	apiary.emit.apply(apiary, arguments);
};