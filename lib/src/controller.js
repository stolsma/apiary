/**
 * Start a Haibu Controller for a given user and RPC functions
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	child_process = require('child_process'),
	fork = child_process.fork,
	internalRPC = require('../comms/internal');

module.exports = function startHaibuChild(cwd, uid, gid, parentRPC, childRPC) {
	var wrapper	= path.join(__dirname, '..', 'wraps', 'haibuwrap.js'),
		env = {
			HOME: cwd,
			PATH: '/home/sander/local/node/bin:/usr/kerberos/sbin:/usr/kerberos/bin:/usr/lib/ccache:/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:~/bin'
		};
	
	// set spawn options
	var childOptions = {
		cwd: cwd,						// Default is ''
		env: env,						// Default is process.env
		customFds: [-1, -1, -1],		// Default is [-1, -1, -1]
		setsid: false,					// Default is false
		uid: uid,						// not described option in NodeJS docs. Default is -1
		gid: gid						// not described option in NodeJS docs. Default is -1
	}
	
	// Fork to haibuwrap and redirect standard outputs to parents standard outputs and create RPC comms
	child = fork(wrapper, [], childOptions);
	child.stdout.on('data', function (data) {
		console.log('Child ', uid, ' stdout: ' + data);
	});
	child.stderr.on('data', function (data) {
		console.log('Child ', uid, ' stderr: ' + data);
	});
	child.on('exit', function (code) {
		console.log('Child ', uid, ' exited with code ', code);
		// delete property to avoid mem problems?
		delete child.RPCsession;
	});
	child.RPCsession = internalRPC(child, parentRPC, childRPC);
	
	// display the pid of the child
	console.log('Child PID for ', uid, ' is :', child.pid);
	
	// return child for later use
	return child;
}
