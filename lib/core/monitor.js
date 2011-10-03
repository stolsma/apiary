/**
 * monitor.js: Core functionality for the process Monitor object.
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * Adapted from Forever
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 *
 * @author TTC/Sander Tolsma/Charlie Robbins
 * @docauthor TTC/Sander Tolsma/Charlie Robbins
 */

var inherits = require('util').inherits,
	fs = require('fs'),
	path = require('path'),
	EventEmitter = require('eventemitter2').EventEmitter2,
	fork = require('node-fork').fork,
	rpc = require('./rpc');

// eventEmitter2 and comms constants
var EVENT_OPTIONS = {
	delimiter: '::',
	childDelimiter: 'child',
	wildcard: true
};

/**
 * Creates a new instance of Monitor with specified params.
 * @params {string} script The target script to run.
 * @params {Object} options Configuration for this instance.
 */
var Monitor = module.exports = function(script, options) {
	var self = this;
	
	// Setup basic configuration options
	options           = options || {};
	this.eventOptions = options.eventOptions || EVENT_OPTIONS;
	this.forever      = options.forever || false;
	this.max          = options.max;
	this.childExists  = false;
	this.times        = 0;
	
	// Setup restart timing. These options control how quickly Monitor restarts
	// a child process as well as when to kill a "spinning" process
	this.minUptime     = typeof options.minUptime !== 'number' ? 0 : options.minUptime;
	this.spinSleepTime = options.spinSleepTime || null;
	
	// Setup the options to pass to the script to start
	this.script    = script;
	this.options   = options.options || [];
	this.spawnWith = options.spawnWith || {};
	this.sourceDir = options.sourceDir;
	this.cwd       = options.cwd || null;
	this.env       = options.env || {};
	this.hideEnv   = options.hideEnv || [];
	this._hideEnv  = {};
	
	// Create a simple mapping of `this.hideEnv` to an easily indexable object
	this.hideEnv.forEach(function (key) {
		self._hideEnv[key] = true;
	});
	
	if (this.sourceDir) {
		this.script = path.join(this.sourceDir, this.script);
	}
	
	// check if the requested script to fork exists
	try {
		var stats = fs.statSync(this.script);
		this.childExists = true;
	} catch (ex) {}
	
	// Call the parent EventEmitter2 constructor
	EventEmitter.call(this, this.eventOptions);
};
// Inherit from EventEmitter2
inherits(Monitor, EventEmitter);


/**
 * Tries to fork the target Monitor child process. It checks the childExists
 * property to see if the script exists.
 * @returns {ChildProcess/Boolean} Returns the created child process or false if 
 * something went wrong
 */
Monitor.prototype.tryFork = function() {
	if (!this.childExists) {
		return false;
	}
	
	this.spawnWith.cwd = this.cwd || this.spawnWith.cwd;
	this.spawnWith.env = this._getEnv();
	  
	try {
		return fork(this.script, this.options, this.spawnWith);
	} catch (err) {
		return false;
	}
};


/**
 * Start the process that this instance is configured for
 * @param {boolean} restart Value indicating whether this is a restart.
 * @returns {Monitor} This monitor instance
 */
Monitor.prototype.start = function(restart) {
	var self = this;

	if (this.running && !restart) {
		process.nextTick(function () {
			self.emit('error', new Error('Cannot start process that is already running.'));
		});
	}

	var child = this.tryFork();
	if (!child) {
		this.child = null;
		process.nextTick(function() {
			self.emit('error', new Error('Target script does not exist: ' + self.script));
		});
		return this;
	}

	this.ctime = Date.now();
	this.child = child;
	this.running = true;

	process.nextTick(function() {
		self.emit(restart ? 'restart' : 'start', self, self.data);
	});

	// Hook all stream data and process it
	function listenTo(stream) {
		function ldata(data) {
			self.emit(stream, data);
		}

		child[stream].on('data', ldata);

		child.on('exit', function() {
			child[stream].removeListener('data', ldata);
		});
	}

	// Listen to stdout and stderr
	listenTo('stdout');
	listenTo('stderr');

	// listen to child exit event
	child.on('exit', function(code) {
		var spinning = Date.now() - self.ctime < self.minUptime;
		self.emit('warn', 'Monitor detected script exited with code: ' + code);

		// remove comms session to prevent memory leaks
		if (this.commsSession) {
			this.commsSession.emit('exit');
			delete this.commsSession;
		};

		function letChildDie() {
			self.running = false;
			self.forceStop = false;
			self.emit('exit', self, spinning);
		}

		function restartChild() {
			self.forceRestart = false;
			process.nextTick(function() {
				self.emit('warn', 'Forever restarting script for ' + self.times + ' time');
				self.start(true);
			});
		}
		
		self.times++;
		
		if (self.forceStop || (!self.forever && self.times >= self.max)
				|| (spinning && typeof self.spinSleepTime !== 'number') && !self.forceRestart) {
			letChildDie();
		} else if (spinning) {
			setTimeout(restartChild, self.spinSleepTime);
		} else {
			restartChild();
		}
	});
	
	// start in-band event communications with the child
	this.commsSession = rpc(this, child, this.eventOptions);
	
	return this;
};


/**
 * Responds with the appropriate information about
 * this `Monitor` instance and it's associated child process.
 * @returns {Object}
 */
Monitor.prototype.__defineGetter__('data', function() {
	var self = this;

	if (!this.running) {
		return {};
	}

	var childData = {
		ctime: this.ctime,
		script: this.script,
		options: this.options,
		pid: this.child.pid,
	};

	['env', 'cwd'].forEach(function(key) {
		if (self[key]) {
			childData[key] = self[key];
		}
	});

	this.childData = childData;
	return this.childData;
});


/**
 * Restarts the target script associated with this instance.
 */
Monitor.prototype.restart = function() {
	this.forceRestart = true;
	return this.kill(false);
};

/**
 * Stops the target script associated with this instance. Prevents it from auto-respawning
 */
Monitor.prototype.stop = function() {
	return this.kill(true);
};

/**
 * Kills the ChildProcess object associated with this instance.
 * @param {boolean} forceStop Value indicating whether short circuit forever auto-restart.
 */
Monitor.prototype.kill = function(forceStop) {
	var self = this;

	if (!this.child || !this.running) {
		process.nextTick(function() {
			self.emit('error', new Error('Cannot stop process that is not running.'));
		});
	} else {
		// Set an instance variable here to indicate this
		// stoppage is forced so that when `child.on('exit', ..)`
		// fires in `Monitor.prototype.start` we can short circuit
		// and prevent auto-restart
		if (forceStop) {
			this.forceStop = true;
		}

		this.child.kill();
		this.emit('stop', this.childData);
	}

	return this;
};

/**
 * Returns the environment variables that should be passed along
 * to the target process spawned by this instance.
 * @returns {Object} 
 * @private
 */
Monitor.prototype._getEnv = function() {
	var self = this,
		merged = {};

	function addKey(key, source) {
		merged[key] = source[key];
	}
  
	// Mixin the key:value pairs from `process.env` and the custom
	// environment variables in `this.env`.
	Object.keys(process.env).forEach(function(key) {
		if (!self._hideEnv[key]) {
			addKey(key, process.env);
		}
	});

	Object.keys(this.env).forEach(function(key) {
		addKey(key, self.env);
	});

	return merged;
};