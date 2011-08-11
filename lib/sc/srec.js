/**
 * A Service Runtime Environment for a given system user, as seen from a System Controller. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	inherits = require('util').inherits,
	inspect = require('util').inspect,
	Hook = require('hook.io').Hook,
    forever = require('forever');

/**
 * Create Service Runtime Environment mirror class
 * @hOptions {Object} Hook server options (host, port etc)
 * @constructor
 */
var Sre = module.exports = function(options) {
	// if called as function return Instance
	if (!(this instanceof Sre)) return new Sre(options);
	
	var self = this;
	this['hook-port'] = options['hook-port'] || 5500;

	// call parent class constructor
	Hook.call(this, options);
	this.listen(function (err) {
		// TODO if Hook server cant be startup then do something...
		return;
	});

	// TODO: change temporary event logging to definitive implementation
	self.onAny(function (data) {
//		console.log('Apiary event: ' + self.name + ' ' + this.event.toString() + '    ' + inspect(arguments))
		console.log('Apiary event: ' + self.name + ' ' + this.event.toString() + '    ' + data.toString())
	});
};
inherits(Sre, Hook);

/**
 * Start a child Sre controller process
 * @cwd {String} The current working directory to start the SRE in.
 * @uid {String/Integer} System user uid
 * @gid {String/Integer} Optional: System user gid. If not defined the given uid is used
 * @return {Sre} 
 */
Sre.prototype.startSre = function(cwd, uid, gid) {
	var self = this;
	
	// spawn Sre Child
	self.child = self.spawn(cwd, uid, gid);
	
	self.child.on('exit', function (code) {
		console.log('SREC Child ', self.uid, ' exited with code ', code);
		// delete properties to avoid memory problems..
		if (self.child) delete self.child;
		// announce that this SREC died unexpectedly!!
		self.emit('ChildExit', code);
	});
	
	// display the pid of the child
	console.log('Child PID for ', uid, ' is :', this.child.child.pid);
	
	// return self for chaining
	return this;
}

/**
 * Spawn a child SRE Controller for this SRE
 * @cwd {String} The current working directory to start the SRE in.
 * @uid {String/Integer} System user uid
 * @gid {String/Integer} Optional: System user gid. If not defined the given uid is used
 * @return {forever.Monitor} 
 */
Sre.prototype.spawn = function(cwd, uid, gid) {
	var self = this,
		child,
//		script = path.join(__dirname, '..', '..', 'node_modules', 'haibu', 'bin', 'haibu-server'),
		script = path.join(__dirname, '..', 'sre', 'srewrap'),
		foreverOptions = {
			silent: true,
			cwd: cwd,
			env: {
				HOME: cwd,
				PATH: path.dirname(process.execPath) + ':/usr/kerberos/sbin:/usr/kerberos/bin:/usr/lib/ccache:/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:~/bin'
			},
			command: path.join(__dirname, '..', '..', 'node_modules', '.bin', 'carapace'),
			options: [
				'--hook-name',
				this.name + '_sre',
				'--hook-port',
				this['hook-port'],
				'--plugin',
     			path.join(__dirname, '..', 'sre', 'sreapi')
			],
			spawnWith: {
				customFds: [-1, -1, -1],		// Default is [-1, -1, -1]
				setsid: false,					// Default is false
				uid: uid,						// not described option in NodeJS docs. Default is -1
				gid: gid						// not described option in NodeJS docs. Default is -1
			}
		};
	
	// use forever to keep this SREC running!!
	child = new forever.Monitor(script, foreverOptions);

	child.on('stdout', function (data) {
		self.emit('srec::stdout', data.toString(), false);
	});

	child.on('stderr', function (data) {
		self.emit('srec::stderr', data.toString(), false);
	});

	child.on('error', function (data) {
		self.emit('srec::err', data.toString(), false);
	});

	child.once('start', function (monitor, data) {
		self.emit('srec::start', data.toString(), false);
	});

	child.start();
	
	return child;
}