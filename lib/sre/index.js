/**
 * A Service Runtime Environment subsystem definition as used by the System Controller. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @module sre
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var path = require('path'),
	inherits = require('util').inherits;

var	apiary = require('../apiary'),
	utils = require('../core/utils');

/**
 * The Service Runtime Environment class as used by the System Controller
 * @class Sre
 * @extends Controller
 *
 * @constructor
 * Create Service Runtime Environment subsystem instance
 * @param {Object} Options SRE config options:
 *		`EVENT_OPTIONS` {Object} EventEmitter2 options. If not defined `delimiter: '::'` and `wildcard: true` will be used
 *		`haibuport` {Integer} Haibu hook start portnumber range. Will be incremented for each new SREC that will be started
 */
var Sre = module.exports = function(options) {
	// if called as function return Instance
	if (!(this instanceof Sre)) return new Sre(options);
	
	options = options || {};
	this.defHaibuPort = options.haibuPort || apiary.config.get('system:haibuPort');
	
	// Call the parent constructor
	Sre.super_.call(this, options);
	
	// fill serviceTypes store with known sse services
	this.serviceAdd('srec', path.join(__dirname, './srec/srec.js'));
};
inherits(Sre, apiary.Controller);


/**
 * Initialize all external events this instance will react on
 */
Sre.prototype.initEvents = function() {
	// Call the parent initEvents function
	Sre.super_.prototype.initEvents.call(this);
	
	// apps events for the different SREC childs
	this.on('*::app::*', this.relayAppEvents);
}


/**
 * Start a child Sre controller process
 * @param {Object} options Object with the following possible configuration options:
 *     `name` {String) The unique name of this SREC instance
 * 	   `cwd`  {String} The current working directory to start the SREC in, default is current process cwd.
 * 	   `uid`  {String/Integer} System user uid, default is -1 (current)
 * 	   `gid`  {String/Integer} System user gid, if not defined the given uid is used, if thats not defined -1 (current)
 * @param {Function} cb Callback to call when new SREC is initialized and running
 */
Sre.prototype.startService = function(options, cb) {
	options = options || {};
	options.type = 'srec';
	options.serviceOptions = {
		'name': options.name,
		'env': 'development',
		'haibu-hook-port': options.haibuPort || this.defHaibuPort++,
		'directory': options.directory
	};
	
	
	// start the SREC with the given options and callback
	var child = Sre.super_.prototype.startService.call(this, options, cb);

	//
	// TODO: Temporary message passing, needs to be replaced by other
	// mechanism. At this moment only one, two and three deep events are bridged
	//
	function msgBridge() {
		var parts = this.event.split(this.delimiter),
			args = Array.prototype.slice.call(arguments);
		
		// cut child and replace with child name
//		parts.splice(0, 1, name);
		parts.unshift(options.name);
		parts.join(this.delimiter);
		
		// send message through to System Controller
		apiary.emit.apply(apiary, [parts.join(this.delimiter)].concat(args));
	}
	child.on('haibu-io::*', msgBridge);
	child.on('haibu-io::*::*', msgBridge);
	child.on('haibu-io::*::*::*', msgBridge);

	return child;
}


/**
 * Log messages from this instance to the logger
 */
Sre.prototype.log = function() {
	apiary.emit.apply(apiary, arguments);
};


/**
 * relay the App events to the correct SREC
 * @param {String} user User to retrieve the SREC Child for
 * @param {Function} cb Callback function if ready. `err` and `srec` are given as arguments to this function 
 */
Sre.prototype.relayAppEvents = function(app, cb) {
	// TODO: if user is null then send message to all SREC childs and the results are returned in a object with user named objects
	var parts = this.event.split(this.delimiter),
		user = parts.shift();
	
	var srec = this.getService(user);
	if (!srec) {
		return cb(new Error('Service Runtime Environment Controller (SREC) for user:' + user + ' does not exists!!'), user);
	}
	
	// listen for callback info by using a random callback event of 60/6 = 10 characters
	var rEvent = utils.randomString(60) + '::ready';
	srec.once(rEvent, function() {
		cb.apply(null, Array.prototype.slice.call(arguments));
	});
	
	srec.emit(parts.join(this.delimiter), app, rEvent);
}