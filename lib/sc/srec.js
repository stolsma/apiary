/**
 * A Service Runtime Environment for a given system user
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	inherits = require('util').inherits,
	EventEmitter = require('events').EventEmitter,
	fork = require('child_process').fork,
	rpcProtocol = require('../comms/internal');
	
// Functions prepended with this string are communicated as RPC calls to child SRE Controller
var rpcId = 'RPC_';

/**
 * Create Service Runtime Environment mirror class
 * @cwd {String} The current working directory to start the SRE in.
 * @uid {String/Integer} System user uid
 * @gid {String/Integer} Optional: System user gid. If not defined the given uid is used
 * @constructor
 */
var Sre = module.exports = function(cwd, uid, gid) {
	this.cwd = cwd;
	this.uid = uid;
	this.gid = gid || uid;
};
inherits(Sre, EventEmitter);

/**
 * Start the configured child Sre controller process
 * @return {Sre} 
 */
Sre.prototype.start = function() {
	var self = this;
	
	// spawn Sre Child
	self.child = self.spawn();
	
	self.child.on('exit', function (code) {
		console.log('Child ', self.uid, ' exited with code ', code);
		// delete properties to avoid memory problems..
		if (self.childRpc) delete self.childRpc;
		if (self.rpcSession) delete self.rpcSession;
		if (self.child) delete self.child;
		// announce that this SREC died unexpectedly!!
		self.emit('ChildExit', self, code);
	});
	
	// bind our internal dnode protocol to the communication channel between this proces and created child process
	this.rpcSession = rpcProtocol(this.child, this.createRpcApi.bind(null, this), this.childReady.bind(this));
	
	// display the pid of the child
	console.log('Child PID for ', this.uid, ' is :', this.child.pid);
	
	// return self for chaining
	return this;
}

/**
 * Spawn a child SRE Controller for this SRE
 * @return {NodeJS Child} 
 */
Sre.prototype.spawn = function() {
	var self = this,
		wrapper	= path.join(__dirname, '..', 'sre', 'sre-wrap.js'),
		env = {
			HOME: this.cwd,
			PATH: '/home/sander/local/node/bin:/usr/kerberos/sbin:/usr/kerberos/bin:/usr/lib/ccache:/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:~/bin'
		},
		child;
	
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
	child = fork(wrapper, [], childOptions);
	child.stdout.on('data', function (data) {
		console.log('Child ', self.uid, ' stdout: ' + data);
	});
	child.stderr.on('data', function (data) {
		console.log('Child ', self.uid, ' stderr: ' + data);
	});
	
	return child;
}

/**
 * Called when child SRE controller has send its RPC API to this instance
 * @childFn {Object}
 * @conn {}
 * @event RPCReady
 */
Sre.prototype.childReady = function(childFn, conn) {
	// save RPC interface
	this.childRpc = childFn;
	// emit ready
	this.emit('RPCReady', childFn, conn);
};

/**
 * Bind functions starting with rpcId given in instance to the 'this' Object
 * @instance {Sre}
 * @childRpc {Object}
 * @conn {}  
 */
Sre.prototype.createRpcApi = function(instance, childRpc, conn) {
	// iterate over all properties and see if there are functions starting with rpcId
	for (var prop in instance) { 
		// Is this propery a function and starting with rpcId string?
		if ((typeof instance[prop] == 'function') && (prop.indexOf(rpcId) == 0)) {
			// define the function in the API object without rpcId prefix and bind it to the instance scope when called
			this[prop.slice(rpcId.length)] = instance[prop].bind(instance, childRpc);
		}
	}
}

/**
 * This function is remotely callable by the child SRE controller
 * @childRpc {Object} Object with functions callable at the child SRE controller
 * @msg {String} Argument send by the child SRE controller when calling this function
 * @cb {Function} Callback function to call when ready executing at this side *** Needs to be called else the remote child call will not return !! *** 
 */
Sre.prototype.RPC_request = function(childRpc, msg, cb) {
	cb('ok');
};
