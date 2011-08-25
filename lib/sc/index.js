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
	this.defSrePort = options.srePort || 5500;
	this.defHaibuPort = options.haibuPort || 5200;

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
 *
 */
Sc.prototype.stop = function(forced) {
	Object.keys(this.sreList).forEach(function(name){
		var self = this;
		this.stopSre(name, function(err, result) {
			if (err) console.log('Error stopping SRE: ' + name + ' with err:', err);
			// last SRE is stopped??
			if (Object.keys(self.sreList).length == 0) {
				// to get all events processed: on nextTick exit this process
				process.nextTick(function () {
					process.exit(0);
				});
			}
		})
	}, this);
}

/**
 * Stop a Service Runtime Environment
 * @param {String} name SRE name to stop
 * @param {Function} cb Callback function if ready. `err` and `result` are given as arguments to this function 
 * @return {Sc} Returns this controller for linking
 */
Sc.prototype.stopSre = function(name, cb) {
	var self = this;
	// check arguments
	cb = cb || function(){}; 
	if (!name || !this.sreList[name]) cb (new Error('Wrong SRE name or SRE does not exists!!'));

	// and stop the SRE
	this.sreList[name].sre.stopSre(function() {
		// remove SRE from list, also if something went wrong!
		delete self.sreList[name];
		// call callback
		cb.apply(null, arguments);
	});
	
	return this;
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
	this.sreList[app.user].sre.startApp(app, cb);
	
	return this;
}