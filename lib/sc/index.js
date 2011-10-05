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
	async = require('async'),
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
	var self = this;
	
	// Call the parent EventEmitter2 constructor
	EventEmitter2.call(this, { delimiter: '::', wildcard: true });
	
	// set default options
	options = options || {};
	
	// Empty active subsystems list
	this.subsystems = {};
	// And activate the message dispatcher for the subsystems
	this.onAny(function() {
		self.dispatch(this.event, Array.prototype.slice.call(arguments));
	});
	
	// Startup required subsystems
	this.startSse();


	// TODO: next three statements are removed when inband events are implemented
	this.defSrePort = options.srePort || apiary.config.get('system:srePort');
	this.defHaibuPort = options.haibuPort || apiary.config.get('system:haibuPort');
	// create the list of operational SRE
	this.sreList = {};

};
inherits(Sc, EventEmitter2);


/**
 * Event dispatch function. Will send events to other subsystems
 */
Sc.prototype.dispatch = function(event, args) {
	var parts = event.split(this.delimiter),
		subsystems = Object.keys(this.subsystems),
		subsystem;
	
	if (subsystems.indexOf(parts[0]) > -1) {
		subsystem = this.subsystems[parts[0]];
		subsystem.emit.apply(subsystem, [event].concat(args));
	};
	
	// TODO: change temporary event logging to definitive implementation
	apiary.emit.apply(apiary, ['sc::' + event].concat(args));
}


Sc.prototype.startSse = function() {
	// create System Service Environment
	this.subsystems.sse = apiary.Sse(this, {
		uid: undefined,
		gid: undefined
	});
	
	// Start an httpproxy System Service
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
 * Stop this System Controller gracefully
 * @param {Function} cb Callback to call when ready; Callback will be called with an array of Error (if any)
 */
Sc.prototype.stop = function(cb) {
	var self = this;
	
	this.subsystems.sse.stop(function() {
		var sreList = Object.keys(self.sreList);
		// no SRE running so just return
		if (sreList.length == 0) return cb();
		
		// stop all running SRE
		sreList.forEach(function(name){
			var self = this,
				errList = [];
			self.stopSre(name, function(err, result) {
				if (err) {
					errList.push(err);
					self.emit('error::stop', err);
				}
				// last SRE is stopped??
				if (Object.keys(self.sreList).length == 0) {
					cb(errList);
				}
			})
		}, self);
	});
}


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
		name: name,
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
 * Add user SRE to the running Apiary System
 * @param {String} user User to add
 * @param {Function} cb Callback function if ready. `err` is given as argument to this function 
 */
Sc.prototype.addUser = function(user, cb) {
	var self = this;
	
	// check arguments
	cb = cb || function(){};

	this.getUserSre(user, function(err, sre) {
		if (!err) return cb(new Error('User already exists!'));

		var options = {
			user: user
		};
		
		// add user to config file
		apiary.config.set('sre:' + user, options);
		apiary.config.save();
		// and start SRE
		self.startSre(options, cb);
	});
}

/**
 * Remove user SRE from the running Apiary System
 * @param {String} user User to remove
 * @param {Function} cb Callback function if ready. `err` is given as argument to this function 
 */
Sc.prototype.removeUser = function(user, cb) {
	// check arguments
	cb = cb || function(){};

	this.stopSre(user, function(err, sre) {
		// remove user from config file
		apiary.config.clear('sre:' + user);
		apiary.config.save();
		cb(err);
	});
}

/**
 * List users in the running Apiary System
 * @param {Function} cb Callback function if ready. `err` and `result` are given as arguments to this function 
 */
Sc.prototype.listUsers = function(cb) {
	// TODO nice listing function!!!
	cb(null, apiary.config.get('sre'));
}

/**
 * Stops apps and removes a user from this Apiary System
 * @param {String} user User to clean
 * @param {Function} cb Callback function if ready. `err` and `result` are given as arguments to this function 
 */
Sc.prototype.cleanUser = function(user, cb) {
	cb(new Error('User cleaning not implemented yet!!'));
}

/**
 * Start an Application
 * @param {String} user User to start the given application for
 * @param {Object} app Application definition object: user, etc
 * @param {Function} cb Callback function if ready. `err` and `result` are given as arguments to this function 
 */
Sc.prototype.startApp = function(user, app, cb) {
	// check arguments
	cb = cb || function(){};

	this.getUserSre(user, function(err, sre) {
		if (err) return cb(err);
		
		app.user = '';
		
		// and start the app in the given user SRE
		sre.emit('app::start', {
			app: app,
			ready: function(err, result) {
				if (!err) {
					// add app to config file
					apiary.config.set('sre:' + user + ':apps:' + app.name, app);
					apiary.config.save();
				}
				cb(err, result);
			}
		});
	});
}

/**
 * Stop an Application
 * @param {String} user User to stop the given application for
 * @param {Object} app Application definition object: user, etc
 * @param {Function} cb Callback function if ready. `err` and `result` are given as arguments to this function 
 */
Sc.prototype.stopApp = function(user, app, cb) {
	cb = cb || function(){}; 

	this.getUserSre(user, function(err, sre) {
		if (err) return cb(err);
		
		app.user = '';
		
		sre.emit('app::stop', {
			app: app,
			ready: function(err, result) {
				if (!err) {
					// add app to config file
					apiary.config.clear('sre:' + user + ':apps:' + app.name);
					apiary.config.save();
				}
				cb(err, result);
			}
		});
	});
}

/**
 * Update an Application
 * @param {String} user User to update the given application for
 * @param {Object} app Application definition object: user, etc
 * @param {Function} cb Callback function if ready. `err` and `result` are given as arguments to this function 
 */
Sc.prototype.updateApp = function(user, app, cb) {
	cb = cb || function(){}; 

	this.getUserSre(user, function(err, sre) {
		if (err) return cb(err);
		
		app.user = '';
		
		sre.emit('app::update', {
			app: app,
			ready: function(err, result) {
				if (!err) {
					// add app to config file
					apiary.config.set('sre:' + user + ':apps:' + app.name, app);
					apiary.config.save();
				}
				cb(err, result);
			}
		});
	});
}

/**
 * Stops the potentially running application then removes all dependencies
 * and source files associated with the application.
 * @param {String} user User to clean the given application for
 * @param {Object} app Application definition object: user, etc
 * @param {Function} cb Callback function if ready. `err` and `result` are given as arguments to this function 
 */
Sc.prototype.cleanApp = function(user, app, cb) {
	cb = cb || function(){}; 

	this.getUserSre(user, function(err, sre) {
		if (err) return cb(err);
		
		app.user = '';
		
		sre.emit('app::clean', {
			app: app,
			ready: function(err, result) {
				// add app to config file
				apiary.config.clear('sre:' + user + ':apps:' + app.name);
				apiary.config.save();
				cb(err, result);
			}
		});
	});
}

/**
 * Retrieve the current app list for specified user or retrieve them for all users when missing user.
 * @param {String} user (optional) User to retrieve the application list for
 * @param {Function} cb Callback function if ready. `err` and `result` are given as arguments to this function 
 */
Sc.prototype.listApp = function(user, cb) {
	// clean arguments
	var self = this;
	cb = (!cb && typeof(user) == 'function') ? user : cb;

	// get the running application list for given user
	function getList(user, cb) {
		self.getUserSre(user, function(err, sre) {
			if (err) return cb(err);

			function processList(err, list) {
				var result = {};
				result[user] = list;
				
				cb(err, result);
			}
			
			sre.emit('app::list', {
				ready: processList
			});
		});
	}
	
	// list for specific user requested
	if (user && typeof(user) == 'string') {
		getList(user, cb);
	} else { // list for all users requested
		var result = {};
		async.forEach(Object.keys(this.sreList), function(name, next){
			getList(name, function(err, list){
				result[name] = list[name];
				next(err); 
			});
		}, function(err) {
			cb(err, result);
		});
	}
}

/**
 * Retrieve the SRE of the given user
 * @param {String} user User to retrieve the SRE for
 * @param {Function} cb Callback function if ready. `err` and `sre` are given as arguments to this function 
 */
Sc.prototype.getUserSre = function(user, cb) {
	// TODO: users <> sre.name... Find something to couple SRE to user and vice versa
	if (!this.sreList[user]) {
		return cb(new Error('Service Runtime Environmet (SRE) for user:' + user + ' does not exists!!'))
	}
	cb(null, this.sreList[user].sre);
}