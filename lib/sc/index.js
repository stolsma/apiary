/**
 * An Apiary System Controller definition. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var path = require('path'),
	inherits = require('util').inherits,
	inspect = require('util').inspect,
	EventEmitter2 = require('eventemitter2').EventEmitter2;
	
var	apiary = require('../apiary');
	
/**
 * The System Controller class definition
 * @class Sc
 * @extends EventEmitter2
 *
 * @constructor
 * Create System Controler class
 * @param {Object} Options Sc config options:
 */
var Sc = module.exports = function(options) {
	// if called as function return Instance
	if (!(this instanceof Sc)) return new Sc(options);
	
	// set default options
	options = options || {};
	this.defSrePort = options.srePort || apiary.config.get('system:srePort');
	this.defHaibuPort = options.haibuPort || apiary.config.get('system:haibuPort');

	// create the list of operational SRE
	this.sreList = {};

	// TODO: change temporary event logging to definitive implementation
	this.onAny(function (data) {
		apiary.emit('sc::' + this.event, data);
	});
};
inherits(Sc, EventEmitter2);

/**
 * Start a Service Runtime Environment for given user
 * @param {Object} options SRE startup options: user, port (optional) = apiary.defSrePort, haibuPort (optional) = apiary.defHaibuPort
 * @param {Function} cb Callback function if ready. `err` and `result` are given as arguments to this function 
 * @return {Sre} Returns created Sre instance
 */
Sc.prototype.startSre = function(options, cb) {
	var sre, self = this,
		user = options.user || null,
		name = options.name || user,
		port = options.port || this.defSrePort++,
		haibuPort = options.haibuPort || this.defHaibuPort++;
	
	// check if cb exists...
	cb = cb ? cb : function cb() {};
	
	// TODO Check if user exists as user in system!!!
	// for now only check if user is defined and just asume it is also defined in system!! ;-)
	if (!user) return cb(new Error('User does not exists!'));
	
	// start System Runtime Environment or call cb when SRE already defined with this name
	if (this.sreList[name]) return cb(null, this.sreList[name]);
	sre = apiary.Sre({
		name: name,
		'hook-port': port
	});
	this.sreList[name] = {
		user: user,
		port: port,
		haibuPort: haibuPort,
		sre: sre
	};
	
	// TODO: change temporary event logging to definitive implementation
	sre.onAny(function (data) {
		self.emit(sre.name + '::' + this.event, data)
	});
	
	// Start the SRE and call the callback when ready
	sre.startSre({
			cwd: '/home/'+user,
			uid: user,
			gid: user,
			haibuPort: haibuPort
		},
		cb
	);
	
	return sre;
}

/**
 * Stop this System Controller gracefully
 * @param {Function} cb Callback to call when ready; Callback will be called with an array of Error (if any)
 */
Sc.prototype.stop = function(cb) {
	Object.keys(this.sreList).forEach(function(name){
		var self = this,
			errList = [];
		this.stopSre(name, function(err, result) {
			if (err) {
				errList.push(err);
				self.emit('error::stop', err);
			}
			// last SRE is stopped??
			if (Object.keys(self.sreList).length == 0) {
				cb(errList);
			}
		})
	}, this);
}

/**
 * Stop a Service Runtime Environment
 * @param {String} name SRE name to stop
 * @param {Function} cb Callback function if ready. `err` and optionally `sre` (Sre instance) are given as arguments to this function 
 */
Sc.prototype.stopSre = function(name, cb) {
	var self = this;
	// check arguments
	cb = cb || function(){}; 
	if (!name || !this.sreList[name]) return cb (new Error('Wrong SRE name or SRE ' + name + ' does not exists!!'));

	// and stop the SRE
	this.sreList[name].sre.stopSre(2000, function(err, sre) {
		// remove SRE from list, also if something went wrong!
		delete self.sreList[name];
		// call callback
		cb(err, sre);
	});
}

/**
 * Start an Application
 * @param {Object} app Application definition object: user, etc
 * @param {Function} cb Callback function if ready. `err` and `result` are given as arguments to this function 
 * @return {Sc} Returns this controller for linking
 */
Sc.prototype.startApp = function(app, cb) {
	// check arguments
	cb = cb || function(){}; 

	// TODO: users <> sre.name... Find something to couple SRE to user and vice versa
	if (!app.user || !this.sreList[app.user]) {
		return cb(new Error('Service Runtime Environmet (SRE) for user:' + app.user + ' does not exists!!'))
	}
	// and start the app in the given user SRE
	this.sreList[app.user].sre.emit('app::start', {
		app: app,
		ready: function(err, result) {
			if (err) 
				cb(new Error('User: ' + app.user + '; App Start error!!'), err);
			else 
				cb(null, result);
		}
	});
	
	return this;
}

/**
 * Stop an Application
 * @param {Object} app Application definition object: user, etc
 * @param {Function} cb Callback function if ready. `err` and `result` are given as arguments to this function 
 * @return {Sc} Returns this controller for linking
 */
Sc.prototype.stopApp = function(app, cb) {
	// check arguments
	cb = cb || function(){}; 

	// TODO: users <> sre.name... Find something to couple SRE to user and vice versa
	if (!app.user || !this.sreList[app.user]) {
		return cb(new Error('Service Runtime Environmet (SRE) for user:' + app.user + ' does not exists!!'))
	}
	// and stop the app in the given user SRE
	this.sreList[app.user].sre.emit('app::stop', {
		app: app,
		ready: cb
	});
	
	return this;
}