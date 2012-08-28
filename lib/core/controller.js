/**
 * controller.js: Generic child service controller module.
 *
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @module controller
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */
 
var path = require('path'),
	inherits = require('util').inherits,
	async = require('async'),
	EventEmitter2 = require('eventemitter2').EventEmitter2,
	Child = require('intercom').EventChild;

var	utils = require('../core/utils');

// The number to add to a self asigned Child Service name
var serviceBase = 1;

// eventEmitter2 constants
var EVENT_OPTIONS = {
		delimiter: '::',
		wildcard: true
	};

/**
 * The Controller class definition
 * @class Controller
 * @extends EventEmitter2
 *
 * @constructor
 * Create Controller instance
 * @param {Object} Options Controller config options:
 */
var Controller = module.exports = function(options) {
	options = options || {};
	this.name = options.name || 'service';
	
	// empty serviceTypes store
	this.serviceTypes = {};
	
	// emtpty running Services list
	this.running = {};
	
	// Call the parent EventEmitter2 constructor
	EventEmitter2.call(this, options.eventOptions || EVENT_OPTIONS);
	
	// initialize external events
	this.initEvents();
};
inherits(Controller, EventEmitter2);


/**
 * Stop this Controller with its child Services gracefully
 * @param {Function} cb Callback to call when ready; Callback will be called with an array of Error (if any)
 */
Controller.prototype.stop = function(cb) {
	var self = this,
		list = Object.keys(this.running);
	
	function stopService(name, next) {
		self.stopService(name, function(err, result) {
			if (err) self.log('log::' + self.name + '::' + name + '::stop::error', err);
			next(null, {
				name: name,
				err: err,
				result: result
			});
		})
	}
	
	// stop all running child Services
	async.map(list, stopService, function(err, results) {
		cb(results);
	});
}


/**
 * Initialize all external events this instance will react on
 */
Controller.prototype.initEvents = function() {
	this.on('service::start', this.startService);
	this.on('service::stop', this.stopService);
	this.on('service::get', this.getService);
};


/**
 * Log messages from this instance to the logger: override with actual log function
 */
Controller.prototype.log = function() {
};


/**
 * Start a child Service process
 * @param {Object} options Object with the following possible configuration options:
 *     `name` {String} The name of the Service to start
 *     `type` {String} The Service type to start
 * @param {Function} cb Callback to call when the Service event API is running
 */
Controller.prototype.startService = function(options, cb) {
	var self = this,
		child;
		
	// set default options
	options = options || {};
	var name = options.name = options.name || this.name + 'Service' + serviceBase++;

	// fork child Service and store	
	var child = this.running[name] = this.fork(options);

	// bind the standard intercom Child events
	child.once('start', this.onStart.bind(this, name)); 
	child.on('restart', this.onRestart.bind(this, name)); 
	child.on('stop', this.onStop.bind(this, name));
	child.on('exit', this.onExit.bind(this, name));
	child.on('stdout', this.onStdout.bind(this, name));
	child.on('stderr', this.onStderr.bind(this, name)); 
	child.on('error', this.onError.bind(this, name));
	child.on('warn', this.onStdout.bind(this, name));

	// listen for callback info by using a random callback event of 60/6 = 10 characters
	var cbEvent = utils.randomString(60) + '::ready';
	// actions to execute when the Service is indicating that its initialized and running
	child.on(cbEvent, function(data) {
		self.log('log::' + self.name + '::' + name + '::running', data, options);
		cb();
	});
	
	// actions to execute when event communication is ready
	child.on('rpcready', function() {
		var childData = child.data;
		self.log('log::' + self.name + '::' + name + '::rpcready', {
			'name': name,
			'type': options.type,
			'file': childData.script,
			'childData': childData
		});
		// give the new Service instance its configuration to initialize with
		child.emit('child::start', options.serviceOptions || {}, cbEvent);
	});
	
	// TODO: Timer to stop new child Service when it takes to long to get initialized

	// start the child Service
	child.start();
	
	return child;
}


/**
 * Stop the given child Service
 * @param {String} name Name of the Service to stop.
 * @param {Number} timeout Time (ms) to wait for the Service to close. If not in time then cb is called with error.
 * @param {Function} cb Callback to call when ready with (err, self)
 */
Controller.prototype.stopService = function(name, timeout, cb) {
	var self = this,
		child = this.running[name],
		timeoutId;

	// argument screening
	cb = cb ? cb : (typeof(timeout) == 'function') ? timeout : function(){};
	timeout = (typeof(timeout) == 'number') ? timeout : 5000;
	if (!child) return cb(new Error('System Service to stop (' + name + ') is not running!'));
	
	// if not stopped in stopTime ms call calback with error
	timeoutId = setTimeout(
		function(){
			// clear timeout
			timeoutId = null;
			cb(new Error('Timeout stopping System Service :' + name), child);
		}, 
		timeout
	);
	
	// listen for callback info by using a random callback event of 60/6 = 10 characters
	var cbEvent = utils.randomString(60) + '::ready';
	// actions to execute when the child Service is indicating that its ready to be stopped
	child.once(cbEvent, function(data) {
		// child Service is in a clean state. Now stop (i.e. kill) it...
		child.stop();
		delete self.running[name];
		self.log('log::' + self.name + '::' + name + '::stopped', data);
		if (timeoutId) {
			clearTimeout(timeoutId);
			cb();
		}
	});
	
	// let child Service do cleanup before stop
	child.emit('child::stop', cbEvent);
}


/**
 * Retrieve the child Service instance with the given name
 * @param {String} name Intercom.Child instance name to retrieve the Child for
 * @param {Function} cb Callback function if ready. `err` and `name` are given as arguments to this function 
 * @return {Intercom.Child/undefined} If Child exists return it else null. If cb is given an undefined value is returned. 
 */
Controller.prototype.getService = function(name, cb) {
	if (!this.running[name]) {
		return cb ? cb(new Error('Service with name:' + name + ' does not exists!!'), name) : null;
	}
	return cb ? cb(null, name) : this.running[name];
}


/**
 * Called when the Intercom.Child object emits the 'start' event.
 * @param {Intercom.Child} child The Intercom.Child instance emitting the event
 * @param {Object} childData Object with information about the child:
 *     `ctime` this.ctime,
 *     `command` this.command,
 *     `file` this.options[0],
 *     `foreverPid` process.pid,
 *     `logFile` this.logFile,
 *     `options` this.options.slice(1),
 *     `pid` this.child.pid,
 *     `silent` this.silent,
 *     `uid` this.uid
 */
Controller.prototype.onStart = function(name, child, childData) {
	this.log('log::' + this.name + '::' + name + '::start', childData);
}


/**
 * Called when the monitor object emits the 'restart' event.
 * @param {Intercom.Child} child The Intercom.Child instance emitting the event
 * @param {Object} childData Object with information about the child:
 *     `ctime` this.ctime,
 *     `command` this.command,
 *     `file` this.options[0],
 *     `foreverPid` process.pid,
 *     `logFile` this.logFile,
 *     `options` this.options.slice(1),
 *     `pid` this.child.pid,
 *     `silent` this.silent,
 *     `uid` this.uid
 */
Controller.prototype.onRestart = function(name, child, childData) {
	this.log('log::' + this.name + '::' + name + '::restart', childData);
}


/**
 * Called when the Child.kill function is called
 * @param {Object} childData Object with information about the child:
 *    ctime: this.ctime,
 *    command: this.command,
 *    file: this.options[0],
 *    foreverPid: process.pid,
 *    logFile: this.logFile,
 *    options: this.options.slice(1),
 *    pid: this.child.pid,
 *    silent: this.silent,
 *    uid: this.uid
 */
Controller.prototype.onStop = function(name, childData) {
	this.log('log::' + this.name + '::' + name + '::stop', childData);
}


/**
 * Called when the Intercom.Child object emits the 'exit' event.
 * @param {Intercom.Child} child The Intercom.Child instance emitting the event
 * @param {Boolean} spinning Exited within minimum required uptime (minUptime)
 */
Controller.prototype.onExit = function onExit(name, child, spinning) {
	// announce that this System Service died unexpectedly!!
	this.log('log::' + this.name + '::' + name + '::exit', child.pid, spinning);
}


/**
 * Called when the Intercom.Child object emits the 'stdout' event.
 * @param {String} data The data send with stdout
 */
Controller.prototype.onStdout = function(name, data) {
	this.log('log::' + this.name + '::' + name + '::stdout', data.toString());
}


/**
 * Called when the Intercom.Child object emits the 'stderr' event.
 * @param {String} data The data send with stderr
 */
Controller.prototype.onStderr = function(name, data) {
	this.log('log::' + this.name + '::' + name + '::stderr', data.toString());
}


/**
 * Called when the child monitor object emits the 'error' event.
 * @param {Error} data The error object send with error
 */
Controller.prototype.onError = function(name, data) {
	this.log('log::' + this.name + '::' + name + '::error', data.toString());
}


/**
 * Fork a child Service for this Controller
 * @param {Object} options Object with the following possible configuration options:
 *     `name` {String} The name of the child Service to start
 *     `type` {String} The child Service type to startup
 *     `cwd`  {String} The current working directory to start the child Service in, default is current process cwd.
 *     `uid`  {String/Integer} System user uid, default is -1 (current)
 *     `gid`  {String/Integer} System user gid, if not defined the given uid is used, if thats not defined -1 (current)
 * @return {Child} Initialized Intercom.Child instance 
 */
Controller.prototype.fork = function(options) {
  var cwd = options.cwd || process.cwd(),
    script = this.serviceGet(options.type),
    childOptions = {
      visible: true,
      max: options.max || 5,
      cwd: cwd,
      env: {
        HOME: cwd,
        PATH: path.dirname(process.execPath) + ':/usr/kerberos/sbin:/usr/kerberos/bin:/usr/lib/ccache:/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:~/bin'
      },
      options: options.options || [],
      spawnWith: {
        uid: options.uid || 0,					// not described option in NodeJS docs. Default is -1
        gid: options.gid || options.uid || 0,	// not described option in NodeJS docs. Default is -1
        detached: true
      }
    };

  // use Child to keep this Service running!!
  return new Child(script, childOptions);
};


/**
 * Retrieves the Service startup script location for the specified Service type  
 * @param {string} type The type name of the service to retrieve
 */
Controller.prototype.serviceGet = function (type) {
	var type = typeof type === 'string' ? type.toLowerCase() : '';
      
	if (!this.serviceTypes[type]) {
		throw new Error('Cannot return Service for unknown type ' + type);
	}
	return this.serviceTypes[type];
};


/**
 * Adds a new Service location to the Service list
 * @param {String} name Name of the Service to add
 * @param {String} script Startup script location of the Service instance
 */
Controller.prototype.serviceAdd = function (name, script) {
	if (this.serviceTypes[name]) {
		throw new Error('A Service with this name (' + name + ') already exists!');
	}
	this.serviceTypes[name] = script;
};


/**
 * Removes a Service startup script location from the Service list
 * @param {String} name Name of the Service to remove
 */
Controller.prototype.serviceRemove = function (name) {
	if (!this.serviceTypes[name]) {
		throw new Error('A Service type with this name (' + name + ') does not exists!');    
	} 
	delete this.serviceTypes[name];
};


/**
 * Lists all Service types in the Service list. Returns array of names.
 * @returns {Array} Array of known Service types
 */
Controller.prototype.serviceList = function () {
	return Object.keys(this.serviceTypes);
};