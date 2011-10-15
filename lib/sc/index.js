/**
 * An Apiary System Controller definition. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @module sc
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var path = require('path'),
	inherits = require('util').inherits,
	async = require('async'),
	EventEmitter2 = require('eventemitter2').EventEmitter2;

var randomString = require('../core/utils').randomString;
	
/**
 * The System Controller class definition
 * @class Sc
 * @extends EventEmitter2
 *
 * @constructor
 * Create a System Controler instance
 */
var Sc = module.exports = function() {
	// if called as function return Instance
	if (!(this instanceof Sc)) return new Sc();
	
	// Call the parent EventEmitter2 constructor
	EventEmitter2.call(this, { delimiter: '::', wildcard: true });
	
	// Empty active subsystems list
	this.subsystems = {};
	
	// And activate the message dispatcher to/from the subsystems
	this.onAny(this.dispatch);
};
inherits(Sc, EventEmitter2);


/**
 * Start this System Controller by starting all subsystems, srec's and apps
 * @param {Logging} logging Instance of the subsystem used for logging events/actions
 * @param {Function} cb Callback to call when ready; Callback will be called with an array of Errors (if any)
 */
Sc.prototype.start = function(logging, cb) {
	var self = this;
	
	function startSrec(user, next) {
		
		function startApp(app, next) {
			var appOpt = options.apps[app];
			appOpt.name = app;
			self.emitCb('sre::' + user + '::app::start', appOpt, next);
		}
		
		function startApps(err, result) {
			if (options.apps) {
				async.forEach(Object.keys(options.apps), startApp, next);
			} else
				next(err, result);
		}
		
		var options 		= self.config.get('sre:' + user);
		options.user		= user;
		options.name		= options.name || user;
		options.directory	= options.directory || 'data';
		options.cwd			= options.cwd || '/home/' + user;
		options.uid			= options.uid || user;
		options.gid			= options.gid || user
		
		self.emitCb('sre::service::start', options, startApps);
	}
	
	// Add/Startup required subsystems
	this.startSse();
	this.startSre();

	// start for the given users a SREC with the defined apps
	async.forEach(Object.keys(this.config.get('sre')), startSrec, cb);
}

Sc.prototype.emitCb = function() {
	var args = Array.prototype.slice.call(arguments),
		cb = args.pop();
		cbEvent = {
			__type__: 'cbEvent',
			cbEvent: randomString(60)		
		};
	
	// put event callback listener on the event stack
	this.on(cbEvent.cbEvent, function() {
		cb.apply(this, arguments);
	});
	
	// push callback event object to the end of the args instead of callback function
	args.push(cbEvent);
	this.emit.apply(this, arguments);
}


/**
 * Stop this System Controller gracefully
 * @param {Function} cb Callback to call when ready; Callback will be called with an array of Error (if any)
 */
Sc.prototype.stop = function(cb) {
	var self = this;
	if (self.subsystems.sse) { 
		self.subsystems.sse.stop(function() {
			if (self.subsystems.sre) { 
				self.subsystems.sre.stop(function(err) {
					cb(err);
				});
			}
		});
	}
}


/**
 * Event dispatch function. Will send directed events to the designated subsystems
 * @param {String/Array} event Event to dispatch to the correct subsystem
 * @param {Array} args Arguments to dispatch with the event to the correct subsystem
 */
Sc.prototype.dispatch = function() {
	var event = this.event,
		args = Array.prototype.slice.call(arguments),
		parts = event.split(this.delimiter),
		first = parts.shift(),
		subsystems = Object.keys(this.subsystems);

	// Send all global events to the logger to be logged if needed
	this.logger.emit.apply(this.logger, ['event::sc::' + event].concat(args));
	
	// send to correct subsystem
	if (subsystems.indexOf(first) > -1) {
		var subsystem = this.subsystems[first];
		subsystem.emit.apply(subsystem, [parts.join(subsystem.delimiter)].concat(args));
	};
	
}

/**
 * Start the System Service Environment subsystem for this Apiary System
 */
Sc.prototype.startSse = function() {
	// create System Service Environment
	this.subsystems.sse = this.Sse(this, {
		uid: undefined,
		gid: undefined
	});
	
	// Temporaray !!!! Start an httpproxy System Service
	// TODO: look into config file for System Services to start!!!
	this.emit('sse::startss', {
		name: 'httpproxy-80',
		type: 'httpproxy',
		uid: -1,
		gid: -1
	}, function(err, result) {
		// httpproxy startup callback
	});		
}


/**
 * Start the Service Resource Environment subsystem for this Apiary System
 */
Sc.prototype.startSre = function() {
	// create System Resource Environment
	this.subsystems.sre = this.Sre(this);
}


/**
 * Start the API Environment subsystem for this Apiary System
 */
Sc.prototype.startApie = function() {
	// create API Environment
	this.subsystems.apie = this.Apie(this);
}