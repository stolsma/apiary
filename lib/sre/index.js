/**
 * A Service Runtime Environment subsystem definition as used by the System Controller. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @module sre
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var path = require('path'),
	inherits = require('util').inherits,
	inspect = require('util').inspect,
	EventEmitter2 = require('eventemitter2').EventEmitter2,
	Child = require('intercom').EventChild;

var	apiary = require('../apiary'),
	randomString = require('../core/utils').randomString;
	
// eventEmitter2 options constants
var EVENT_OPTIONS = {
		delimiter: '::',
		wildcard: true
	};


/**
 * The Service Runtime Environment class as used by the System Controller
 * @class Sre
 * @extends EventEmitter2
 *
 * @constructor
 * Create Service Runtime Environment subsystem instance
 * @param {Object} Options SRE config options:
 *		`EVENT_OPTIONS` {Object} EventEmitter2 options. If not defined `delimiter: '::'` and `wildcard: true` will be used
 *		`haibuport` {Integer} Haibu hook start portnumber range. Will be incremented for each new SREC that will be started
 */
var Sre = module.exports = function(options) {
	// if called as function return Instance
	if (!(this instanceof Sre)) return new Sre(options);
	
	options = options || {};
	
	// emtpty running System Resource Environment list
	this.running = {};
	this.defHaibuPort = options.haibuPort || apiary.config.get('system:haibuPort');
	
	// Call the parent EventEmitter2 constructor
	EventEmitter2.call(this, options.EVENT_OPTIONS || EVENT_OPTIONS);
	
	// initialize all external events
	this.initEvents();
};
inherits(Sre, EventEmitter2);


/**
 * Stop this System Resource Environment gracefully
 * @param {Function} cb Callback to call when ready; Callback will be called with an array of Error (if any)
 */
Sre.prototype.stop = function(cb) {
	var self = this;
	
	var srecList = Object.keys(this.running);
	// no SREC running so just return
	if (srecList.length == 0) return cb();
		
	// stop all running SREC
	srecList.forEach(function(name){
		var errList = [];
		self.stopSrec(name, function(err, result) {
			if (err) {
				errList.push(err);
				apiary.emit('srec::' + name + '::stop::error', err);
			}
			
			// last SREC is stopped??
			if (Object.keys(self.running).length == 0) {
				cb(errList);
			}
		})
	});
}


/**
 * Initialize all external events this instance will react on
 */
Sre.prototype.initEvents = function() {
	// srec events
	this.onCb('service::start', this.startSrec);
	this.onCb('service::stop', this.stopSrec);
	this.onCb('service::get', this.getSrec);
	
	// apps events for the different SREC childs
	this.onCb('*::app::*', this.relayAppEvents);
}

Sre.prototype.onCb = function(event, fn) {
	function createCb() {
		var args = Array.prototype.slice.call(arguments),
			event = this.event,
			last, cbEvent;
		
		// Get last argument and check if it is a cbEvent object
		last = args.pop();
		if ((typeof last === 'object') && (last.__type__ === 'cbEvent') && last.event) {
			// get callback event and replace last with callback function
			cbEvent = last.event;
			args.push(function() {
				var args = Array.prototype.slice.call(arguments);
				// push the callback event to the front of the returned arguments
				args.unshift(cbEvent);
				apiary.emit.apply(apiary, args);
			});
		} else {
			// no callback event as last argument so push last argument if not undefined and an empty callback function
			if (typeof last !== 'undefined') args.push(last);
			args.push(function(){});
		}
		// call the function with the changed args
		fn.apply(this, args)
	};
	
	// let our own function listen for the requested event
	this.on(event, createCb)
}


/**
 * Start a child Sre controller process
 * @param {Object} options Object with the following possible configuration options:
 *     `name` {String) The unique name of this SREC instance
 * 	   `cwd`  {String} The current working directory to start the SREC in, default is current process cwd.
 * 	   `uid`  {String/Integer} System user uid, default is -1 (current)
 * 	   `gid`  {String/Integer} System user gid, if not defined the given uid is used, if thats not defined -1 (current)
 * @param {Function} cb Callback to call when new SREC is initialized and running
 */
Sre.prototype.startSrec = function(options, cb) {
	var self = this;
	
	// spawn Sre Child
	var child = this.running[options.name] = this.spawn(options);

	// bind to the standard Intercom.Child events
	child.once('start', this.onStart.bind(this, options.name)); 
	child.on('restart', this.onRestart.bind(this, options.name)); 
	child.on('stop', this.onStop.bind(this, options.name));
	child.on('exit', this.onExit.bind(this, options.name));
	child.on('stdout', this.onStdout.bind(this, options.name));
	child.on('stderr', this.onStderr.bind(this, options.name)); 
	child.on('error', this.onChildError.bind(this, options.name));

	// listen for callback info by using a random callback event of 60/6 = 10 characters
	var cbEvent = randomString(60) + '::ready';
	// actions to execute when the SREC is indicating that its initialized and running
	child.on(cbEvent, function() {
		apiary.emit('srec::' + options.name + '::running', options);
		cb();
	});
	
	// actions to execute when SREC event communication is ready
	child.on('rpcready', function() {
		// give the new SREC its configuration to initialize with
		child.emit('child::start', {
			'name': options.name,
			'env': 'development',
			'haibu-hook-port': options.haibuPort || self.defHaibuPort++,
			'directory': options.directory
		}, cbEvent);
	});
	
	// TODO: Timer to stop new SREC child when it takes the SREC to long to get initialized

	// start the new SREC child process
	child.start();
}

/**
 * Stop the SREC for the given uid
 * @param {String} uid Id of the SREC to stop
 * @param {Number} timeout Time (ms) to wait for SRE to close (default = 2000). If not in time then cb is called with error.
 * @param {Function} cb Callback to call when ready (err, self)
 */
Sre.prototype.stopSrec = function(uid, timeout, cb) {
	var self = this;

	// argument screening
	cb = cb ? cb : (typeof(timeout) == 'function') ? timeout : function(){};
	timeout = (typeof(timeout) == 'number') ? timeout : 5000;

	// get SREC child instance
	var child = this.running[uid];
	if (!child) return cb(new Error('SREC to stop (' + uid + ') is not running!'));
	
	// if not stopped in stopTime call calback with error
	var timeoutId = setTimeout(function(){
			// clear timeout
			timeoutId = null;
			apiary.emit('srec::' + uid + '::stoptimer');
			cb(new Error('Timeout stopping SREC :' + uid), uid);
		}, 
		timeout
	);
	
	// listen for callback info by using a random callback event of 60/6 = 10 characters
	var cbEvent = randomString(60) + '::ready';
	// actions to execute when the SREC is indicating that its ready to be stopped
	child.once(cbEvent, function(data) {
		// SREC is in a clean state. Now stop (i.e. kill) it...
		child.stop();
		delete self.running[uid];
		apiary.emit('srec::' + uid + '::stopped', data);
		if (timeoutId) {
			clearTimeout(timeoutId);
			cb();
		}
	});
	
	// let SREC do cleanup before stop
	child.emit('child::stop', cbEvent);
}


/**
 * Retrieve the SREC Child of the given user
 * @param {String} user User to retrieve the SREC Child for
 * @param {Function} cb Callback function if ready. `err` and `srec` are given as arguments to this function 
 * @return {Intercom.Child/undefined} If SREC child exists return it else null. If cb is given an undefined value is returned. 
 */
Sre.prototype.getSrec = function(user, cb) {
	// TODO: users <> sre.name... Find something to couple SRE to user and vice versa
	if (!this.running[user]) {
		return cb ? cb(new Error('Service Runtime Environment Controller (SREC) for user:' + user + ' does not exists!!'), user) : null;
	}
	return cb ? cb(null, user) : this.running[user];
}


/**
 * relay the App events to the correct SREC
 *
 * @param {String} user User to retrieve the SREC Child for
 * @param {Function} cb Callback function if ready. `err` and `srec` are given as arguments to this function 
 */
Sre.prototype.relayAppEvents = function(app, cb) {
	// TODO: if user is null then send message to all SREC childs and the results are returned in a object with user named objects
	var parts = this.event.split(this.delimiter),
		user = parts.shift();
	
	var srec = this.getSrec(user);
	if (!srec) {
		return cb(new Error('Service Runtime Environment Controller (SREC) for user:' + user + ' does not exists!!'), user);
	}
	
	// listen for callback info by using a random callback event of 60/6 = 10 characters
	var rEvent = randomString(60) + '::ready';
	srec.once(rEvent, function() {
		cb.apply(null, Array.prototype.slice.call(arguments));
	});
	
	srec.emit(parts.join(this.delimiter), app, rEvent);
}


/**
 * Called when the monitor object emits the 'start' event.
 * @param {forever.Monitor} monitor The monitor instance emitting the event
 * @param {String} file Path to the forever child monitor configuration file
 * @param {Object} childData Object with information about the child
 */
Sre.prototype.onStart = function(name, monitor, childData) {
	apiary.emit('srec::' + name + '::childstart', childData);
}

/**
 * Called when the monitor object emits the 'restart' event.
 * @param {forever.Monitor} monitor The monitor instance emitting the event
 * @param {String} file Path to the forever child monitor configuration file
 * @param {Object} childData Object with information about the child
 */
Sre.prototype.onRestart = function(name, monitor, childData) {
	apiary.emit('srec::' + name + '::childrestart', childData);
}

/**
 * Called when the Monitor.kill function is called
 * @param {Object} childData Object with information about the child
 */
Sre.prototype.onStop = function(name, childData) {
	apiary.emit('srec::' + name + '::childstop', childData);
}

/**
 * Called when the child monitor object emits the 'exit' event.
 * @param {forever.Monitor} child The monitor instance emitting the event
 * @param {Boolean} spinning Exited within minimum required uptime (minUptime)
 */
Sre.prototype.onExit = function onExit(name, child, spinning) {
	// announce that this SRE died unexpectedly!!
	apiary.emit('srec::' + name + '::childexit', child.pid, spinning);
}

/**
 * Called when the child monitor object emits the 'stdout' event.
 * @param {String} data The data send with stdout
 */
Sre.prototype.onStdout = function(name, data) {
	console.log('stdout: ', name, data.toString());
	apiary.emit('srec::' + name + '::stdout', data.toString());
}

/**
 * Called when the child monitor object emits the 'stderr' event.
 * @param {String} data The data send with stderr
 */
Sre.prototype.onStderr = function(name, data) {
	console.log('stderr: ', name, data.toString());
	apiary.emit('srec::' + name + '::stderr', data.toString());
}

/**
 * Called when the Child monitor object emits the 'error' event.
 * @param {Error} data The error object send with error
 */
Sre.prototype.onChildError = function(name, text, err) {
	apiary.emit('srec::' + name + '::err', text.toString(), err.message, err.stack);
}

/**
 * Spawn a child SRE Controller
 * @param {Object} options Object with the following possible configuration options:
 * 	    `cwd` {String} The current working directory to start the SREC in, default is current process cwd.
 * 	    `uid` {String/Integer} System user uid, default is -1 (current)
 * 	    `gid` {String/Integer} System user gid, if not defined the given uid is used, if thats not defined -1 (current)
 * @return {Intercom.Child} Initialized Intercom.Child instance 
 */
Sre.prototype.spawn = function(options) {
	var cwd = options.cwd || process.cwd(),
		script = path.join(__dirname, 'srec', 'srec.js'),
		childOptions = {
			visible: true,
			cwd: cwd,
			env: {
				HOME: cwd,
				PATH: path.dirname(process.execPath) + ':/usr/kerberos/sbin:/usr/kerberos/bin:/usr/lib/ccache:/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:~/bin'
			},
			options: [],
			spawnWith: {
				customFds: [-1, -1, -1],				// Default is [-1, -1, -1]
				setsid: true,							// Default is false
				uid: options.uid || -1,					// not described option in NodeJS docs. Default is -1
				gid: options.gid || options.uid || -1	// not described option in NodeJS docs. Default is -1
			}
		};
	
	// use Intercom.Child to keep this SREC running with an event communication channel!!
	return new Child(script, childOptions);
}