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
	inherits = require('util').inherits,
	Hook = require('hook.io').Hook,
    forever = require('forever');

/**
 * The System Service Environment class definition used by the System Controller
 * @class Sse
 * @extends Hook
 *
 * @constructor
 * Create System Service Environment mirror class
 * @param {Object} Options SSE config options:
 *    `name' {} Name of the hook
 *    `type' {} Type of the hook
 *    `debug` {Boolean} True if debugging messages need to be 
 *    `hook-host` {} Hostname
 *    `hook-port` {Integer} Port number
 *    `hook-socket` {Path} Domain socket description
 */
var Sse = module.exports = function(options) {
	// if called as function return Instance
	if (!(this instanceof Sse)) return new Sse(options);
	
	// create instance specific properties like
	// fill ssTypes store with known sse services
	this.ssTypes = {
		httpproxy: path.join(__dirname, './httpproxy/index.js')
	};
	// emtpty running System Service list
	this.running = {};
	// What is the port this hook service is reacting on
	this['hook-port'] = options['hook-port'] || 5500;

	// call parent class constructor with given options
	Hook.call(this, options);
	// start hook listening
	this.listen(function (err) {
		// TODO if Hook server cant be startup then do something...
		return;
	});
};
inherits(Sse, Hook);

/**
 * Start a child System Service process
 * @param {Object} options Object with the following possible configuration options:
 * 	   `cwd` {String} The current working directory to start the System Service in, default is current process cwd.
 * 	   `uid` {String/Integer} System user uid, default is -1 (current)
 * 	   `gid` {String/Integer} System user gid, if not defined the given uid is used, if thats not defined -1 (current)
 * @param {Function} cb Callback to call when System Service API is running
 * @return {Ss} Running System Service
 */
Sse.prototype.ssStart = function(options, cb) {
	var self = this,
		child;

	// TODO: deepclone options object to prevent interference from other processes
	// options = deepclone(options);
	
	// spawn SS Child
	this.child = child = this.spawn(options);

	// bind the standard forever.Monitor events
	child.once('start', this.onStart.bind(this)); 
	child.on('restart', this.onRestart.bind(this)); 
	child.on('stop', this.onStop.bind(this));
	child.on('exit', this.onExit.bind(this));
	child.on('stdout', this.onStdout.bind(this));
	child.on('stderr', this.onStderr.bind(this)); 
	child.on('error', this.onError.bind(this));

	// actions to execute when SRE is ready
	this.on('*::ss::running', function(ssName, conf) {
		if (child.name === ssName) {
			self.emit('ss::started', {
				'type': options.type,
				'name': ssName,
				'conf': conf,
				ready: cb
			});
		}
	});

	child.start();
	
	// display the pid of the child
	this.emit('ss::childpid', 'Child PID for System Service ' + options.type + ' is :' + child.child.pid, false);
	
	// return self for chaining
	return this;
}

/**
 * Stop this System Service
 * @param {Number} timeout Time (ms) to wait for System Service to close. If not in time then cb is called with error.
 * @param {Function} cb Callback to call when ready with (err, self)
 */
Sse.prototype.ssStop = function(timeout, cb) {
	var self = this,
		child,
		timeoutId;

	// argument screening
	cb = cb ? cb : (typeof(timeout) == 'function') ? timeout : function(){};
	timeout = (typeof(timeout) == 'number') ? timeout : 2000;
	
	// if not stopped in stopTime ms call calback with error
	timeoutId = setTimeout(
		function(){
			// clear timeout
			timeoutId = null;
			cb(new Error('Timeout stopping System Service :' + self.name), self);
		}, 
		timeout
	);
	
	// indicate to forever that this process doesn't need to restart if it stops!!
	this.child.forceStop = true;
	
	// let System Service do cleanup before stop
	this.emit(this.child.name + '::ss::stop', function stopReady(){
		// System Service cleanly exited. Now stop it...
		self.child.stop();

		// log that this System Service stopped cleanly...
		self.emit('ss::stopped', self.name, false);

		// check if timeout already occured, if not remove and call cb.
		if (timeoutId) {
			clearTimeout(timeoutId);
			return cb(null, self);
		}
	});
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
Sse.prototype.onStart = function(monitor, file, childData) {
	this.emit('sse::childstart', file.pid, false);
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
Sse.prototype.onRestart = function(monitor, file, childData) {
	this.emit('sse::childrestart', file.pid, false);
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
Sse.prototype.onStop = function(childData) {
	this.emit('sse::childstop', childData.pid, false);
}

/**
 * Called when the child monitor object emits the 'exit' event.
 * @param {forever.Monitor} child The monitor instance emitting the event
 * @param {Boolean} spinning Exited within minimum required uptime (minUptime)
 */
Sse.prototype.onExit = function onExit(child, spinning) {
	// announce that this System Service died unexpectedly!!
	this.emit('sse::childexit', child.pid, false);
}

/**
 * Called when the child monitor object emits the 'stdout' event.
 * @param {String} data The data send with stdout
 */
Sse.prototype.onStdout = function(data) {
	this.emit('sse::stdout', data.toString(), false);
}

/**
 * Called when the child monitor object emits the 'stderr' event.
 * @param {String} data The data send with stderr
 */
Sse.prototype.onStderr = function(data) {
	this.emit('sse::stderr', data.toString(), false);
}

/**
 * Called when the child monitor object emits the 'error' event.
 * @param {Error} data The error object send with error
 */
Sse.prototype.onError = function(data) {
	this.emit('sse::err', data.toString(), false);
}

/**
 * Spawn a child System Service for this SSE
 * @param {Object} options Object with the following possible configuration options:
 *		`type` {String} The System Service type to startup
 * 	    `cwd`  {String} The current working directory to start the System Service in, default is current process cwd.
 * 	    `uid`  {String/Integer} System user uid, default is -1 (current)
 * 	    `gid`  {String/Integer} System user gid, if not defined the given uid is used, if thats not defined -1 (current)
 * @return {forever.Monitor} Initialized forever.Monitor instance 
 */
Sse.prototype.spawn = function(options) {
	var cwd = options.cwd || process.cwd(),
		foreverOptions = {
			silent: true,
			cwd: cwd,
			env: {
				HOME: cwd,
				PATH: path.dirname(process.execPath) + ':/usr/kerberos/sbin:/usr/kerberos/bin:/usr/lib/ccache:/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:~/bin'
			},
//			command: path.join(require.resolve('haibu-carapace'), '..', '..', 'bin', 'carapace'),
			options: [
				'--hook-name',
				this.type,
				'--hook-port',
				this['hook-port'],
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
	
	// use forever to keep this SRE running!!
	return new forever.Monitor(script, foreverOptions);
}

/**
 * Retrieves the service startup script location for the specified ss type  
 * @param {string} type The type name of the service to retrieve
 */
Sse.prototype.ssGet = function (type, options) {
	var type = typeof type === 'string' ? type.toLowerCase() : '';
      
	if (type === '' || !ss[type]) {
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