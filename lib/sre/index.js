/**
 * A Service Runtime Environment for a given system user, as used by the System Controller. 
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
 * The Service Runtime Environment class definition used by the System Controller
 * @class Sre
 * @extends Hook
 *
 * @constructor
 * Create Service Runtime Environment mirror class
 * @param {Object} Options SRE config options:
 *    `name' {} Name of the hook
 *    `type' {} Type of the hook
 *    `debug` {Boolean} True if debugging messages need to be 
 *    `hook-host` {} Hostname
 *    `hook-port` {Integer} Port number
 *    `hook-socket` {Path} Domain socket description
 */
var Sre = module.exports = function(options) {
	// if called as function return Instance
	if (!(this instanceof Sre)) return new Sre(options);
	
	var self = this;
	this['hook-port'] = options['hook-port'] || 5500;

	// call parent class constructor with given options
	Hook.call(this, options);
	// start hook listening
	this.listen(function (err) {
		// TODO if Hook server cant be startup then do something...
		return;
	});
};
inherits(Sre, Hook);

/**
 * Start a child Sre controller process
 * @param {Object} options Object with the following possible configuration options:
 * 	   `cwd` {String} The current working directory to start the SRE in, default is current process cwd.
 * 	   `uid` {String/Integer} System user uid, default is -1 (current)
 * 	   `gid` {String/Integer} System user gid, if not defined the given uid is used, if thats not defined -1 (current)
 * @param {Function} cb Callback to call when SRE API is running
 * @return {Sre} Running SRE
 */
Sre.prototype.startSre = function(options, cb) {
	var self = this,
		child;
	
	// spawn Sre Child
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
	this.on('*::carapace::running', function(srecName) {
		self.emit('sre::start', {
			'haibu-hook-port': options.haibuPort,
			ready: cb
		});
	});

	child.start();
	
	// display the pid of the child
	this.emit('sre::childpid', 'Child PID for ' + options.uid + ' is :' + child.child.pid, false);
	
	// return self for chaining
	return this;
}

/**
 * Stop this Sre
 * @param {Function} cb Callback to call when ready
 */
Sre.prototype.stopSre = function(cb) {
	var self = this;
	
	// indicate to forever that this process doesn't need to restart if it stops!!
	this.child.forceStop = true;
	
	// let SRE do cleanup before stop
	this.emit('sre::stop', function stopReady(){
		// SRE cleanly exited. Now stop it...
		self.child.stop();

		// log that this SRE stopped cleanly...
		self.emit('sre::stopped', self.name, false);

		// stop myself as hook.io server
		self.server.close();

		// yep ready!!
		return cb();
	});
}

/**
 * Start an App in this Sre
 * @param {Object} app Application definition object: user, etc
 * @param {Function} cb Callback to call when ready
 */
Sre.prototype.startApp = function(app, cb) {
	this.emit('app::start', {
		app: app,
		ready: function(err, result) {
			if (err) 
				cb(new Error('User: ' + app.user + '; App Start error!!'), err);
			else 
				cb(null, result);
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
Sre.prototype.onStart = function(monitor, file, childData) {
	this.emit('sre::childstart', file, false);
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
Sre.prototype.onRestart = function(monitor, file, childData) {
	this.emit('sre::childstart', file, false);
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
Sre.prototype.onStop = function(childData) {
	this.emit('sre::childstop', childData, false);
}

/**
 * Called when the child monitor object emits the 'exit' event.
 * @param {forever.Monitor} child The monitor instance emitting the event
 * @param {Boolean} spinning Exited within minimum required uptime (minUptime)
 */
Sre.prototype.onExit = function onExit(child, spinning) {
	// announce that this SRE died unexpectedly!!
	this.emit('sre::childexit', child, false);
}

/**
 * Called when the child monitor object emits the 'stdout' event.
 * @param {String} data The data send with stdout
 */
Sre.prototype.onStdout = function(data) {
	this.emit('sre::stdout', data.toString(), false);
}

/**
 * Called when the child monitor object emits the 'stderr' event.
 * @param {String} data The data send with stderr
 */
Sre.prototype.onStderr = function(data) {
	this.emit('sre::stderr', data.toString(), false);
}

/**
 * Called when the child monitor object emits the 'error' event.
 * @param {Error} data The error object send with error
 */
Sre.prototype.onError = function(data) {
	this.emit('sre::err', data.toString(), false);
}

/**
 * Spawn a child SRE Controller for this SRE
 * @param {Object} options Object with the following possible configuration options:
 * 	    `cwd` {String} The current working directory to start the SRE in, default is current process cwd.
 * 	    `uid` {String/Integer} System user uid, default is -1 (current)
 * 	    `gid` {String/Integer} System user gid, if not defined the given uid is used, if thats not defined -1 (current)
 * @return {forever.Monitor} Initialized forever.Monitor instance 
 */
Sre.prototype.spawn = function(options) {
	var cwd = options.cwd || process.cwd(),
		script = path.join(__dirname, 'srewrap'),
		foreverOptions = {
			silent: true,
			cwd: cwd,
			env: {
				HOME: cwd,
				PATH: path.dirname(process.execPath) + ':/usr/kerberos/sbin:/usr/kerberos/bin:/usr/lib/ccache:/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:~/bin'
			},
			command: path.join(require.resolve('haibu-carapace'), '..', '..', 'bin', 'carapace'),
			options: [
				'--hook-name',
				this.name + '_sre',
				'--hook-port',
				this['hook-port'],
				'--plugin',
     			path.join(__dirname, 'sreapi')
			],
			spawnWith: {
				customFds: [-1, -1, -1],				// Default is [-1, -1, -1]
				setsid: true,							// Default is false
				uid: options.uid || -1,					// not described option in NodeJS docs. Default is -1
				gid: options.gid || options.uid || -1	// not described option in NodeJS docs. Default is -1
			}
		};
	
	// use forever to keep this SRE running!!
	return new forever.Monitor(script, foreverOptions);
}