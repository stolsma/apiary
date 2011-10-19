/**
 * An API Environment subsystem definition as used by the System Controller. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @module apie
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var path = require('path'),
	inherits = require('util').inherits;
	
var	apiary = require('../apiary');

/**
 * The API Environment class definition as used by the System Controller
 * @class Apie
 * @extends Controller
 *
 * @constructor
 * Create API Environment subsystem instance
 * @param {Object} Options APIE config options:
 * 	  `uid` {String/Integer} Socket user id, default is -1 (current)
 * 	  `gid` {String/Integer} Socket group id, if not defined the given uid is used, if thats not defined -1 (current)
 */
var Apie = module.exports = function(options) {
	// if called as function return Instance
	if (!(this instanceof Apie)) return new Apie(options);
	
	// set default options
	options = options || {};

	// Call the parent constructor
	Sse.super_.call(this, options);
	
	// fill serviceTypes store with known apie services
//	this.serviceAdd('httpproxy', path.join(__dirname, './httpproxy/index.js'));
};
inherits(Apie, apiary.Controller);


/**
 * Initialize all external events this instance will react on
 */
Apie.prototype.initEvents = function() {
	// Call the parent initEvents function
	Sre.super_.prototype.initEvents.call(this);
	
	// API services interface
//	this.on('', this.apisStart);
};


/**
 * Start an API Service process
 * @param {Object} options Object with the following possible configuration options:
 *     `name` {String} The name of the service to start
 *     `type` {String} The API Service type to start
 * 	   `cwd` {String} The current working directory to start the API Service in, default is current process cwd.
 * 	   `uid` {String/Integer} API user uid, default is -1 (current)
 * 	   `gid` {String/Integer} API user gid, if not defined the given uid is used, if thats not defined -1 (current)
 * @param {Function} cb Callback to call when API Service is running
 */
Apie.prototype.startService = function(options, cb) {
	// set default options
	options = options || {};
	options.uid = options.uid || this.uid;
	options.gid = options.gid || this.gid;

	// start the Api Service with the given options and callback
	var child = Apie.super_.prototype.startService.call(this, options, cb);

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
Apie.prototype.log = function() {
	apiary.emit.apply(apiary, arguments);
};