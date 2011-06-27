/**
 * A Service Runtime Environment Controller (SREC) for a given user with given RPC functions
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	util = require('util'),
	EventEmitter = require('events').EventEmitter,
	fork = require('child_process').fork,
	internalProto = require('../comms/internal'),
	scSrecApi = require ('./sc-srec-api');

/**
 * Create Service Runtime Environment mirror class with RPC communication channel
 */
var SREC = exports = module.exports = function(cwd, uid, gid, parentRPC) {
	this.cwd = cwd;
	this.uid = uid;
	this.gid = gid;
	this.parentRPC = parentRPC || scSrecApi;
};
util.inherits(SREC, EventEmitter);

/**
 * Start the SREC for this SRE
 */
SREC.prototype.start = function() {
	var self = this,
		wrapper	= path.join(__dirname, '..', 'sre', 'sc-api.js'),
		env = {
			HOME: this.cwd,
			PATH: '/home/sander/local/node/bin:/usr/kerberos/sbin:/usr/kerberos/bin:/usr/lib/ccache:/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:~/bin'
		};
	
	// set spawn options
	var childOptions = {
		cwd: self.cwd,					// Default is ''
		env: env,						// Default is process.env
		customFds: [-1, -1, -1],		// Default is [-1, -1, -1]
		setsid: false,					// Default is false
		uid: self.uid,					// not described option in NodeJS docs. Default is -1
		gid: self.gid					// not described option in NodeJS docs. Default is -1
	}
	
	// Fork to haibuwrap and redirect standard outputs to parents standard outputs and create RPC comms
	self.child = fork(wrapper, [], childOptions);
	self.child.stdout.on('data', function (data) {
		console.log('Child ', self.uid, ' stdout: ' + data);
	});
	self.child.stderr.on('data', function (data) {
		console.log('Child ', self.uid, ' stderr: ' + data);
	});
	self.child.on('exit', function (code) {
		console.log('Child ', self.uid, ' exited with code ', code);
		// delete property to avoid mem problems?
		delete self.child.RPCsession;
	});
	// bind our internal dnode protocol to the communication channel between this proces and created process
	// use the given parent API (parentRPC)
	self.child.RPCsession = internalProto(self.child, self.parentRPC, self.childReady.bind(self));
	
	// display the pid of the child
	console.log('Child PID for ', self.uid, ' is :', self.child.pid);
	
	// return self for chaining
	return self;
}

SREC.prototype.childReady = function(childFn, conn) {
	// save RPC interface
	this.childRPC = childFn;
	// emit ready
	this.emit('RPCReady', childFn, conn);
};
