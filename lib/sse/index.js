/**
 * A Service Service Environment for a given system, as used by the System Controller. 
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
	Monitor = require('../core/monitor');

// The number to add to a self asigned System Service name
var ssBase = 1;

/**
 * The System Service Environment class definition used by the System Controller
 * @class Sse
 * @extends Dnode
 *
 * @constructor
 * Create System Service Environment mirror class
 * @param {Object} Options SSE config options:
 * 	  `uid` {String/Integer} Socket user id, default is -1 (current)
 * 	  `gid` {String/Integer} Socket group id, if not defined the given uid is used, if thats not defined -1 (current)
 */
var Sse = module.exports = function(sc, options) {
	// if called as function return Instance
	if (!(this instanceof Sse)) return new Sse(sc, options);
	
	// store parent controller
	this.sc = sc;
	
	// fill ssTypes store with known sse services
	this.ssTypes = {
		httpproxy: path.join(__dirname, './httpproxy/index.js')
	};
	
	// emtpty running System Service list
	this.running = {};
};


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
				self.sc.emit('error::stop::' + name, err);
			}
			// last SS is stopped??
			if (Object.keys(self.running) == 0) {
				cb(errList);
			}
		})
		
	}, this);
}


/**
 * Start a child System Service process
 * @param {Object} options Object with the following possible configuration options:
 *     `name` {String} The name of the service to start
 *     `type` {String} The System Service type to start
 * 	   `cwd` {String} The current working directory to start the System Service in, default is current process cwd.
 * 	   `uid` {String/Integer} System user uid, default is -1 (current)
 * 	   `gid` {String/Integer} System user gid, if not defined the given uid is used, if thats not defined -1 (current)
 * @param {Function} cb Callback to call when System Service API is running
 * @return {Ss} Running System Service
 */
Sse.prototype.ssStart = function(options, cb) {
	var self = this,
		child;
		
	// create a System Service name
	var name = options.name = options.name || 'SystemService' + ssBase++;

	// spawn SS Child
	child = this.spawn(options);
	// TODO:  Check if child Monitor is created!!!

	// store running services	
	this.running[name] = child; 

	// bind the standard forever.Monitor events
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
		self.sc.emit('sse::started', {
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
	// mechanism
	//
	child.on('child::*::*', function(text){
		self.sc.emit('sse::msg::' + this.event, text);
	});

	// return self for chaining
	return this;
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
		self.sc.emit('ss::stopped', name);

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
 * @param {forever.Monitor} monitor The monitor instance emitting the event
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
	this.sc.emit('sse::' + name + '::childstart', childData.pid, childData);
}


/**
 * Called when the monitor object emits the 'restart' event.
 * @param {forever.Monitor} monitor The monitor instance emitting the event
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
	this.sc.emit('sse::' + name + '::childrestart', childData.pid, childData);
}


/**
 * Called when the Monitor.kill function is called
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
	this.sc.emit('sse::' + name + '::childstop', childData.pid, childData);
}


/**
 * Called when the child monitor object emits the 'exit' event.
 * @param {forever.Monitor} child The monitor instance emitting the event
 * @param {Boolean} spinning Exited within minimum required uptime (minUptime)
 */
Sse.prototype.onExit = function onExit(name, child, spinning) {
	// announce that this System Service died unexpectedly!!
	this.sc.emit('sse::' + name + '::childexit', child.pid, spinning);
}


/**
 * Called when the child monitor object emits the 'stdout' event.
 * @param {String} data The data send with stdout
 */
Sse.prototype.onStdout = function(name, data) {
	this.sc.emit('sse::' + name + '::stdout', data.toString());
}


/**
 * Called when the child monitor object emits the 'stderr' event.
 * @param {String} data The data send with stderr
 */
Sse.prototype.onStderr = function(name, data) {
	this.sc.emit('sse::' + name + '::stderr', data.toString());
}


/**
 * Called when the child monitor object emits the 'error' event.
 * @param {Error} data The error object send with error
 */
Sse.prototype.onError = function(name, data) {
	this.sc.emit('sse::' + name + '::err', data.toString());
}


/**
 * Spawn a child System Service for this SSE
 * @param {Object} options Object with the following possible configuration options:
 *     `name` {String} The name of the service to start
 *     `type` {String} The System Service type to startup
 * 	   `cwd`  {String} The current working directory to start the System Service in, default is current process cwd.
 * 	   `uid`  {String/Integer} System user uid, default is -1 (current)
 * 	   `gid`  {String/Integer} System user gid, if not defined the given uid is used, if thats not defined -1 (current)
 * @return {forever.Monitor} Initialized forever.Monitor instance 
 */
Sse.prototype.spawn = function(options) {
	var child;
	var cwd = options.cwd || process.cwd(),
		foreverOptions = {
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
	
	// use Monitor to keep this System Service running!!
	child = new Monitor(script, foreverOptions);
	
	// and return created System Service
	return child;
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
	this.se[name] = script;
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