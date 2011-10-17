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
	inspect = require('util').inspect,
	inherits = require('util').inherits,
	EventEmitter2 = require('eventemitter2').EventEmitter2,
	Child = require('intercom').EventChild;

var	apiary = require('../apiary');

// The number to add to a self asigned System Service name
var ssBase = 1;

// eventEmitter2 constants
var EVENT_OPTIONS = {
		delimiter: '::',
		wildcard: true
	};

/**
 * The System Service Environment class definition used by the System Controller
 * @class Sse
 * @extends EventEmitter2
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
	this.uid = options.uid		|| -1;
	this.gid = options.gid		|| -1;
	
	// fill ssTypes store with known sse services
	this.ssTypes = {
		httpproxy: path.join(__dirname, './httpproxy/index.js')
	};
	
	// emtpty running System Service list
	this.running = {};
	
	// Call the parent EventEmitter2 constructor
	EventEmitter2.call(this, EVENT_OPTIONS);
	
	// initialize all external events
	this.initEvents();
};
inherits(Sse, EventEmitter2);


/**
 * Stop this System Service Controller gracefully
 * @param {Function} cb Callback to call when ready; Callback will be called with an array of Error (if any)
 */
Sse.prototype.stop = function(cb) {
	var list = Object.keys(this.running);
	
	// no SRE running so just return
	if (list.length == 0) return cb();
	
	// stop all running SRE
	list.forEach(function(name){
		var self = this, errList = [];
			
		this.ssStop(name, function(err, result) {
			if (err) {
				errList.push(err);
				apiary.emit('error:sse:stop::' + name, err);
			}
			// last SS is stopped??
			if (Object.keys(self.running) == 0) {
				cb(errList);
			}
		})
		
	}, this);
}


/**
 * Initialize all external events this instance will react on
 */
Sse.prototype.initEvents = function() {
	this.on('startss', this.ssStart.bind(this));
};


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
Sse.prototype.ssStart = function(options, cb) {
	var self = this,
		child;
		
	// set default options
	options = options || {};
	options.uid = options.uid || this.uid;
	options.gid = options.gid || this.gid;
	var name = options.name = options.name || 'SystemService' + ssBase++;

	// spawn SS Child
	child = this.spawn(options);
	// TODO:  Check if child Monitor is created!!!

	// store running services	
	this.running[name] = child; 

	// bind the standard forever.Child events
	child.once('start', this.onStart.bind(this, name)); 
	child.on('restart', this.onRestart.bind(this, name)); 
	child.on('stop', this.onStop.bind(this, name));
	child.on('exit', this.onExit.bind(this, name));
	child.on('stdout', this.onStdout.bind(this, name));
	child.on('stderr', this.onStderr.bind(this, name)); 
	child.on('error', this.onError.bind(this, name));
	child.on('warn', this.onStdout.bind(this, name));

	// actions to execute when this System Service is ready
	child.once('start', function(monitor, childData) {
		apiary.emit('ss::started', {
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
 * Stop this System Service
 * @param {String} name Name of the system service to stop.
 * @param {Number} timeout Time (ms) to wait for System Service to close. If not in time then cb is called with error.
 * @param {Function} cb Callback to call when ready with (err, self)
 */
Sse.prototype.ssStop = function(name, timeout, cb) {
	var self = this,
		child = this.running[name],
		timeoutId;

	// argument screening
	cb = cb ? cb : (typeof(timeout) == 'function') ? timeout : function(){};
	timeout = (typeof(timeout) == 'number') ? timeout : 2000;
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
	
	// indicate to forever that this process doesn't need to restart if it stops!!
	child.forceStop = true;
	
	// let System Service do cleanup before stop
/*	child.api.emit('stop', function stopReady(){
		// System Service cleanly exited. Now stop it...
*/		child.stop();

		// emit that this System Service stopped...
		apiary.emit('ss::stopped', name);

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
 * @param {Child} monitor The monitor instance emitting the event
 * @param {String} file Path to the forever child monitor configuration file
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
Sse.prototype.onStart = function(name, monitor, childData) {
	apiary.emit('ss::' + name + '::start', childData.pid, childData);
}


/**
 * Called when the monitor object emits the 'restart' event.
 * @param {Child} monitor The monitor instance emitting the event
 * @param {String} file Path to the forever child monitor configuration file
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
Sse.prototype.onRestart = function(name, monitor, childData) {
	apiary.emit('ss::' + name + '::restart', childData.pid, childData);
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
Sse.prototype.onStop = function(name, childData) {
	apiary.emit('ss::' + name + '::stop', childData.pid, childData);
}


/**
 * Called when the child monitor object emits the 'exit' event.
 * @param {Child} child The monitor instance emitting the event
 * @param {Boolean} spinning Exited within minimum required uptime (minUptime)
 */
Sse.prototype.onExit = function onExit(name, child, spinning) {
	// announce that this System Service died unexpectedly!!
	apiary.emit('ss::' + name + '::exit', child.pid, spinning);
}


/**
 * Called when the child monitor object emits the 'stdout' event.
 * @param {String} data The data send with stdout
 */
Sse.prototype.onStdout = function(name, data) {
	apiary.emit('ss::' + name + '::stdout', data.toString());
}


/**
 * Called when the child monitor object emits the 'stderr' event.
 * @param {String} data The data send with stderr
 */
Sse.prototype.onStderr = function(name, data) {
	apiary.emit('ss::' + name + '::stderr', data.toString());
}


/**
 * Called when the child monitor object emits the 'error' event.
 * @param {Error} data The error object send with error
 */
Sse.prototype.onError = function(name, data) {
	apiary.emit('ss::' + name + '::error', data.toString());
}


/**
 * Spawn a child System Service for this SSE
 * @param {Object} options Object with the following possible configuration options:
 *     `name` {String} The name of the service to start
 *     `type` {String} The System Service type to startup
 * 	   `cwd`  {String} The current working directory to start the System Service in, default is current process cwd.
 * 	   `uid`  {String/Integer} System user uid, default is -1 (current)
 * 	   `gid`  {String/Integer} System user gid, if not defined the given uid is used, if thats not defined -1 (current)
 * @return {Child} Initialized Child instance 
 */
Sse.prototype.spawn = function(options) {
	var cwd = options.cwd || process.cwd(),
		childOptions = {
			visible: true,
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
		var script = this.ssGet(options.type);
	} catch (err) {
		return err;
	}
	
	// use Child to keep this System Service running!!
	return new Child(script, childOptions);
}


/**
 * Retrieves the service startup script location for the specified ss type  
 * @param {string} type The type name of the service to retrieve
 */
Sse.prototype.ssGet = function (type) {
	var type = typeof type === 'string' ? type.toLowerCase() : '';
      
	if (!this.ssTypes[type]) {
		throw new Error('Cannot return SS/SNG for unknown type ' + type);
	}
	return this.ssTypes[type];
};


/**
 * Adds a new System Service location to the System Service list
 * @param {String} name Name of the System Service to add
 * @param {String} script Startup script location of the System Service instance
 */
Sse.prototype.ssAdd = function (name, script) {
	if (this.ssTypes[name]) {
		throw new Error('A System Service with this name (' + name + ') already exists!');
	}
	this.ssTypes[name] = script;
};


/**
 * Removes a System Service startup script location from the System Service list
 * @param {String} name Name of the System Service to remove
 */
Sse.prototype.ssRemove = function (name) {
	if (!this.ssTypes[name]) {
		throw new Error('A System Service type with this name (' + name + ') does not exists!');    
	} 
	delete this.ssTypes[name];
};


/**
 * Lists all System Service types in the System Service list. Returns array of names.
 * @returns {Array} Array of known System Service types
 */
Sse.prototype.ssList = function () {
	return Object.keys(this.ssTypes);
};