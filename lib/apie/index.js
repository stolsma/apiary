/**
 * An API Environment controller definition as used by the System Controller. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var path = require('path'),
	inspect = require('util').inspect,
	inherits = require('util').inherits,
	EventEmitter2 = require('eventemitter2').EventEmitter2,
	Child = require('intercom').Child;

var	apiary = require('../apiary');

// The number to add to a self asigned API Service name
var apiBase = 1;

// eventEmitter2 constants
var EVENT_OPTIONS = {
		delimiter: '::',
		wildcard: true
	};

/**
 * The API Environment class definition as used by the System Controller
 * @class Apie
 * @extends EventEmitter2
 *
 * @constructor
 * Create API Environment subsystem class
 */
var Apie = module.exports = function() {
	// if called as function return Instance
	if (!(this instanceof Apie)) return new Apie();
	
	// fill apisTypes store with known API Services
	this.apisTypes = {
	};
	
	// emtpty running API Service list
	this.running = {};
	
	// Call the parent EventEmitter2 constructor
	EventEmitter2.call(this, EVENT_OPTIONS);
	
	// initialize all external events
	this.initEvents();
};
inherits(Apie, EventEmitter2);


/**
 * Stop this API Environment gracefully
 * @param {Function} cb Callback to call when ready; Callback will be called with an array of Error (if any)
 */
Apie.prototype.stop = function(cb) {
	var list = Object.keys(this.running);
	
	// no API Service running so just return
	if (list.length == 0) return cb();
	
	// stop all running API Service processes
	list.forEach(function(name){
		var self = this, errList = [];
		this.apisStop(name, function(err, result) {
			if (err) {
				errList.push(err);
				apiary.emit('error:apis:stop::' + name, err);
			}
			// last API is stopped??
			if (Object.keys(self.running) == 0) {
				cb(errList);
			}
		})
	}, this);
}


/**
 * Initialize all external events this instance will react on
 */
Apie.prototype.initEvents = function() {
	this.on('startapis', this.apisStart.bind(this));
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
Apie.prototype.apisStart = function(options, cb) {
	var self = this,
		child;
		
	// set default options
	options = options || {};
	options.uid = options.uid || this.uid;
	options.gid = options.gid || this.gid;
	var name = options.name = options.name || 'APIService' + apiBase++;

	// spawn API Service Child
	child = this.spawn(options);
	// TODO:  Check if child Monitor is created!!!

	// store running services	
	this.running[name] = child; 

	// bind the standard Child events
	child.once('start', this.onStart.bind(this, name)); 
	child.on('restart', this.onRestart.bind(this, name)); 
	child.on('stop', this.onStop.bind(this, name));
	child.on('exit', this.onExit.bind(this, name));
	child.on('stdout', this.onStdout.bind(this, name));
	child.on('stderr', this.onStderr.bind(this, name)); 
	child.on('error', this.onError.bind(this, name));
	child.on('warn', this.onStdout.bind(this, name));

	// actions to execute when this API Service is ready
	child.once('start', function(monitor, childData) {
		apiary.emit('apis::started', {
			'name': name,
			'type': options.type,
			'file': childData.script,
			'childData': childData
		});
		// callback if one given
		if (cb) cb();
	});

	// start the System Service
	child.start();

	//
	// TODO: Temporary message passing, needs to be replaced by other
	// mechanism. At this moment only one, two and three deep events are bridged
	// from Child to SC if starting with 'child::'
	//
	function msgBridge() {
		var parts = this.event.split(this.delimiter),
			args = Array.prototype.slice.call(arguments);
		
		// cut child and replace with child name
		parts.splice(0, 1, name);
		parts.join(this.delimiter);
		
		// send message through to System Controller
		apiary.emit.apply(apiary, [parts.join(this.delimiter)].concat(args));
	}
	child.on('child::*', msgBridge);
	child.on('child::*::*', msgBridge);
	child.on('child::*::*::*', msgBridge);
}


/**
 * Stop this API Service
 * @param {String} name Name of the API service to stop.
 * @param {Number} timeout Time (ms) to wait for API Service to close. If not in time then cb is called with error.
 * @param {Function} cb Callback to call when ready with (err, self)
 */
Apie.prototype.apisStop = function(name, timeout, cb) {
	var self = this,
		child = this.running[name],
		timeoutId;

	// argument screening
	cb = cb ? cb : (typeof(timeout) == 'function') ? timeout : function(){};
	timeout = (typeof(timeout) == 'number') ? timeout : 2000;
	if (!child) return cb(new Error('API Service to stop (' + name + ') is not running!'));
	
	// if not stopped in stopTime ms call calback with error
	timeoutId = setTimeout(
		function(){
			// clear timeout
			timeoutId = null;
			cb(new Error('Timeout stopping API Service :' + name), child);
		}, 
		timeout
	);
	
	// indicate to forever that this process doesn't need to restart if it stops!!
	child.forceStop = true;
	
	// let API Service do cleanup before stop
/*	child.api.emit('stop', function stopReady(){
		// API Service cleanly exited. Now stop it...
*/		child.stop();

		// emit that this System Service stopped...
		apiary.emit('apis::stopped', name);

		delete this.running[name];
		
		// check if timeout already occured, if not remove and call cb.
		if (timeoutId) {
			clearTimeout(timeoutId);
			return cb(null, name);
		}
/*	});
*/
}


/**
 * Called when the monitor object emits the 'start' event.
 * @param {Intercom.Child} monitor The Child instance emitting the event
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
Apie.prototype.onStart = function(name, monitor, childData) {
	apiary.emit('apis::' + name + '::start', childData.pid, childData);
}


/**
 * Called when the monitor object emits the 'restart' event.
 * @param {Intercom.Child} monitor The monitor instance emitting the event
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
Apie.prototype.onRestart = function(name, monitor, childData) {
	apiary.emit('apis::' + name + '::restart', childData.pid, childData);
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
Apie.prototype.onStop = function(name, childData) {
	apiary.emit('apis::' + name + '::stop', childData.pid, childData);
}


/**
 * Called when the child object emits the 'exit' event.
 * @param {Intercom.Child} child The child instance emitting the event
 * @param {Boolean} spinning Exited within minimum required uptime (minUptime)
 */
Apie.prototype.onExit = function onExit(name, child, spinning) {
	// announce that this System Service died unexpectedly!!
	apiary.emit('apis::' + name + '::exit', child.pid, spinning);
}


/**
 * Called when the child monitor object emits the 'stdout' event.
 * @param {String} data The data send with stdout
 */
Apie.prototype.onStdout = function(name, data) {
	apiary.emit('apis::' + name + '::stdout', data.toString());
}


/**
 * Called when the child object emits the 'stderr' event.
 * @param {String} data The data send with stderr
 */
Apie.prototype.onStderr = function(name, data) {
	apiary.emit('apis::' + name + '::stderr', data.toString());
}


/**
 * Called when the child object emits the 'error' event.
 * @param {Error} data The error object send with error
 */
Apie.prototype.onError = function(name, data) {
	apiary.emit('apis::' + name + '::error', data.toString());
}


/**
 * Spawn a child API Service for this APIE
 * @param {Object} options Object with the following possible configuration options:
 *     `name` {String} The name of the service to start
 *     `type` {String} The System Service type to startup
 * 	   `cwd`  {String} The current working directory to start the System Service in, default is current process cwd.
 * 	   `uid`  {String/Integer} System user uid, default is -1 (current)
 * 	   `gid`  {String/Integer} System user gid, if not defined the given uid is used, if thats not defined -1 (current)
 * @return {Intercom.Child} Initialized Child instance 
 */
Apie.prototype.spawn = function(options) {
	var cwd = options.cwd || process.cwd(),
		childOptions = {
			cwd: cwd,
			env: {
				HOME: cwd,
				PATH: path.dirname(process.execPath) + ':/usr/kerberos/sbin:/usr/kerberos/bin:/usr/lib/ccache:/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:~/bin'
			},
			options: [
				'-n', options.name,
				'-p'
			],
			spawnWith: {
				customFds: [-1, -1, -1],				// Default is [-1, -1, -1]
				setsid: true,							// Default is false
				uid: options.uid || -1,					// not described option in NodeJS docs. Default is -1
				gid: options.gid || options.uid || -1	// not described option in NodeJS docs. Default is -1
			}
		};
	
	try {
		var script = this.apisGet(options.type);
	} catch (err) {
		return err;
	}
	
	// use Child to keep this API Service running!!
	return new Child(script, childOptions);
}


/**
 * Retrieves the API Service startup script location for the specified API Service type  
 * @param {string} type The type name of the API Service to retrieve
 */
Apie.prototype.apisGet = function(type) {
	var type = typeof type === 'string' ? type.toLowerCase() : '';
      
	if (!this.apisTypes[type]) {
		throw new Error('Cannot return API Service for unknown type ' + type);
	}
	return this.apisTypes[type];
};


/**
 * Adds a new API Service location to the API Service list
 * @param {String} name Name of the API Service to add
 * @param {String} script Startup script location of the API Service instance
 */
Apie.prototype.apisAdd = function(name, script) {
	if (this.apisTypes[name]) {
		throw new Error('An API Service with this name (' + name + ') already exists!');
	}
	this.apisTypes[name] = script;
};


/**
 * Removes a API Service startup script location from the API Service list
 * @param {String} name Name of the API Service to remove
 */
Apie.prototype.apisRemove = function (name) {
	if (!this.apisTypes[name]) {
		throw new Error('An API Service type with this name (' + name + ') does not exists!');    
	} 
	delete this.apisTypes[name];
};


/**
 * Lists all API Service types in the API Service list. Returns array of names.
 * @returns {Array} Array of known API Service types
 */
Apie.prototype.apisList = function () {
	return Object.keys(this.apisTypes);
};