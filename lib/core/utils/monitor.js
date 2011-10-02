/**
 * monitor-fork.js: monkey path forever.Monitor for use of node-fork
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var path = require('path'),
	fs = require('fs'),
	inherits = require('util').inherits,
	inspect = require('util').inspect,
	fork = require('node-fork').fork,
	FEMonitor = require('forever').Monitor;

var Monitor = module.exports = function() {
	FEMonitor.apply(this, arguments);
}
inherits(Monitor, FEMonitor);

//
// ### function trySpawn()
// Tries to spawn the target Forever child process. Depending on
// configuration, it checks the first argument of the options
// to see if the file exists. This is useful is you are
// trying to execute a script with an env: e.g. node myfile.js
//
Monitor.prototype.trySpawn = function() {
	var script = this.options[0];
		args = [].concat(this.options).slice(1);

	if (!this.childExists) {
		try {
			var stats = fs.statSync(script);
			this.childExists = true;
		}
		catch (ex) {
			return false;
		}
	}
	
	this.spawnWith.cwd = this.cwd || this.spawnWith.cwd;
	this.spawnWith.env = this._getEnv();
	  
	try {
		  var child = fork(script, args, this.spawnWith);
	} catch (err) {
		return false;
	}
	return child;
};