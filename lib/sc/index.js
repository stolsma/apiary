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
	inspect = require('util').inspect,
	async = require('async'),
	EventEmitter2 = require('eventemitter2').EventEmitter2;
	
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
	var self = this;
	
	// Call the parent EventEmitter2 constructor
	EventEmitter2.call(this, { delimiter: '::', wildcard: true });
	
	// Empty active subsystems list
	this.subsystems = {};
	// And activate the message dispatcher to/from the subsystems
	this.onAny(function() {
		self.dispatch(this.event, Array.prototype.slice.call(arguments));
	});
};
inherits(Sc, EventEmitter2);


/**
 * Start this System Controller by starting all subsystems, srec's and apps
 * @param {Function} cb Callback to call when ready; Callback will be called with an array of Errors (if any)
 */
Sc.prototype.start = function(cb) {
	var self = this;
	
	function startSrec(user, next) {
		
		function startApp(app, next) {
			var appOpt = options.apps[app];
			appOpt.name = app;
			self.emit('sre::' + user + '::app::start', appOpt, next);
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
		
		self.emit('sre::srec::start', options, startApps);
	}
	
	// Startup required subsystems
	this.startSse();
	this.startSre();

	// start for the given users a SREC with the defined apps
	async.forEach(Object.keys(this.config.get('sre')), startSrec, cb);
}


/**
 * Stop this System Controller gracefully
 * @param {Function} cb Callback to call when ready; Callback will be called with an array of Error (if any)
 */
Sc.prototype.stop = function(cb) {
	var self = this;
	self.subsystems.sse.stop(function() {
		self.subsystems.sre.stop(function(err) {
			cb(err);
		});
	});
}


/**
 * Event dispatch function. Will send directed events to the designated subsystems
 */
Sc.prototype.dispatch = function(event, args) {
	var parts = event.split(this.delimiter),
		first = parts.shift(),
		subsystems = Object.keys(this.subsystems);
	
	if (subsystems.indexOf(first) > -1) {
		var subsystem = this.subsystems[first];
		subsystem.emit.apply(subsystem, [parts.join(subsystem.delimiter)].concat(args));
	};
	
	// TODO: change temporary event logging to definitive implementation
	console.log('apiary::' + event.toString() + '    ' + inspect(args));
}


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


Sc.prototype.startSre = function() {
	// create System Resource Environment
	this.subsystems.sre = this.Sre(this);
}
