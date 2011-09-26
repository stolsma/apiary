/**
 * server.js: API Server for the Apiary CLI.
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var dnode = require('dnode');

/**
 * The Cli Server class definition
 * @class CliServer
 *
 * @constructor
 * Create CLI Server class
 * @param {Apiary} apiary The Apiary system to connect to
 * @param {Object} options (optional) CliServer config options:
 */
var CliServer = module.exports = function(apiary, options) {
	// if called as function return Instance
	if (!(this instanceof CliServer)) return new CliServer(apiary, options);

	// set default options
	options = options || {};
	this.socket = options.cliSocket || null;
	
	// set the Apiary System to talk with	
	this.apiary = apiary;
}

/**
 * Attempts to spawn the CLI server for this instance. 
 * @param {String} socket (optional) Socket to connect to
 * @param {Function} cb Continuation function to respond to when complete
 * @return {CliServer} This cliServer instance, makes linking possible
 */
CliServer.prototype.listen = function (socket, cb) {
	if (typeof(socket) == 'function') {
		cb = socket;
		socket = undefined;
	}
	cb = cb || function() {};

	var self = this,
		apiary = this.apiary;
		
	this.listening = true;

	this.server = dnode(function (client, conn) {
		apiary.emit('cliserver::connected', client);

		// start building the API
		this.getServerPid = self.getServerPid.bind(self);
		this.appStart = self.appStart.bind(self);
		this.appStop = self.appStop.bind(self);
		this.appUpdate = self.appUpdate.bind(self);
		this.appClean = self.appClean.bind(self);
		this.appList = self.appList.bind(self);
		this.userAdd = self.userAdd.bind(self);
		this.userRemove = self.userRemove.bind(self);
		this.userList = self.userList.bind(self);
		this.userClean = self.userClean.bind(self);
	});

	this.server.on('connection', function (conn) {
		apiary.emit('cliserver::open', conn);
	});

	this.server.on('ready', function () {
		cb();
	});

	try {
		this.server.listen(socket || this.socket);
	}
	catch (ex) {
		cb(ex);
	}
	
	// make continuation possible
	return this;
}

/**
 * (API) Return the running pid to the given callback function
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.getServerPid = function(cb) {
	cb(process.pid);
}

/**
 * (API) Start an application on this Apiary System
 * @param {String} user User to start the given application for
 * @param {Object} app Application description
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.appStart = function(user, app, cb) {
	if (this.apiary.sc) {
		this.apiary.sc.startApp(user, app, cb);
	} else {
		cb(new Error('System Controller not defined!!'));
	}
}

/**
 * (API) Stops an application on this Apiary System
 * @param {String} user User to stop the given application for
 * @param {Object} app Application description
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.appStop = function(user, app, cb) {
	if (this.apiary.sc) {
		this.apiary.sc.stopApp(user, app, cb);
	} else {
		cb(new Error('System Controller not defined!!'));
	}
}

/**
 * (API) Updates an application on this Apiary System
 * @param {String} user User to update the given application for
 * @param {Object} app Application description
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.appUpdate = function(user, app, cb) {
	if (this.apiary.sc) {
		this.apiary.sc.updateApp(user, app, cb);
	} else {
		cb(new Error('System Controller not defined!!'));
	}
}

/**
 * (API) Stops and removes (an) application(s) from this Apiary System
 * @param {String} user User to clean the given application for
 * @param {Object} app Application description
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.appClean = function(user, app, cb) {
	if (this.apiary.sc) {
		this.apiary.sc.cleanApp(user, app, cb);
	} else {
		cb(new Error('System Controller not defined!!'));
	}
}

/**
 * (API) Lists all apps running on this Apiary System or running for given user
 * @param {String} user (optional) User to list the applications for
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.appList = function(user, cb) {
	if (this.apiary.sc) {
		this.apiary.sc.listApp(user, cb);
	} else {
		cb(new Error('System Controller not defined!!'));
	}
}


/**
 * (API) Add user to the running Apiary System
 * @param {String} user User to add
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.userAdd = function(user, cb) {
	if (this.apiary.sc) {
		this.apiary.sc.addUser(user, cb);
	} else {
		cb(new Error('System Controller not defined!!'));
	}
}

/**
 * (API) Remove user from this running Apiary System
 * @param {String} user User to remove
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.userRemove = function(user, cb) {
	if (this.apiary.sc) {
		this.apiary.sc.removeUser(user, cb);
	} else {
		cb(new Error('System Controller not defined!!'));
	}
}

/**
 * (API) Lists all users on this running Apiary System
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.userList = function(cb) {
	if (this.apiary.sc) {
		this.apiary.sc.listUsers(cb);
	} else {
		cb(new Error('System Controller not defined!!'));
	}
}

/**
 * (API) Stops apps and removes a user from this Apiary System
 * @param {String} user User to clean
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.userClean = function(user, cb) {
	if (this.apiary.sc) {
		this.apiary.sc.cleanUser(user, cb);
	} else {
		cb(new Error('System Controller not defined!!'));
	}
}