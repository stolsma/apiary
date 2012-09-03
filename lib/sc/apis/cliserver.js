/**
 * server.js: API Server for the Apiary CLI.
 *
 * Copyright 2011-2012 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var dnode = require('dnode');

// constants
var noop = function(){};


/**
 * The Cli Server class definition
 * @class CliServer
 *
 * @constructor
 * Create CLI Server class
 * @param {Object} options (optional) CliServer config options:
 */
var CliServer = module.exports = function(apie, options) {
  // if called as function return Instance
  if (!(this instanceof CliServer)) return new CliServer(apie, options);

  // save apie event comms instance
//  this.apie = apie;
  this.apis = require('../../apiary');

  // set default options
  options = options || {};
  this.socket = options.cliSocket || null;
};


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
  cb = cb || noop;

  var self = this;
  this.listening = true;

  this.server = dnode(function( /* client, conn */) {
    self.apis.emit('child::cliserver::connected');

    // start building the API
    this.getServerPid = self.getServerPid.bind(self);
    this.appStart     = self.appStart.bind(self);
    this.appStop      = self.appStop.bind(self);
    this.appUpdate    = self.appUpdate.bind(self);
    this.appClean     = self.appClean.bind(self);
    this.appList      = self.appList.bind(self);
    this.userAdd      = self.userAdd.bind(self);
    this.userRemove   = self.userRemove.bind(self);
    this.userList     = self.userList.bind(self);
    this.userClean    = self.userClean.bind(self);
  });

  this.server.on('connection', function(/* conn */) {
    self.apis.emit('child::cliserver::open');
  });

  this.server.on('ready', function() {
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
};


/**
 * (API) Return the running pid to the given callback function
 * @param {Function} cb Continuation function to respond to when complete
 */
CliServer.prototype.getServerPid = function(cb) {
  cb(process.pid);
};


/**
 * (API) Start an application on this Apiary System
 * @param {String} user User to start the given application for
 * @param {Object} app Application description
 * @param {Function} cb (optional) Continuation function to respond to when complete
 */
CliServer.prototype.appStart = function(user, app, cb) {
  var self = this;
  cb = cb || noop;

  // and start the app in the given user SRE
  this.apis.emit('sre::' + user + '::app::start', app, function(err, result) {
    if (!err) {
      // add app to config file
      self.apis.config.set('sre:' + user + ':apps:' + app.name, app);
      self.apis.config.save();
    }
    cb(err, result);
  });
};


/**
 * (API) Stops an application on this Apiary System
 * @param {String} user User to stop the given application for
 * @param {Object} app Application description
 * @param {Function} cb (optional) Continuation function to respond to when complete
 */
CliServer.prototype.appStop = function(user, app, cb) {
  var self = this;
  cb = cb || noop; 

  this.apis.emit('sre::' + user + '::app::stop', app, function(err, result) {
    if (!err) {
      // add app to config file
      self.apis.config.clear('sre:' + user + ':apps:' + app.name);
      self.apis.config.save();
    }
    cb(err, result);
  });
};


/**
 * (API) Updates an application on this Apiary System
 * @param {String} user User to update the given application for
 * @param {Object} app Application description
 * @param {Function} cb (optional) Continuation function to respond to when complete
 */
CliServer.prototype.appUpdate = function(user, app, cb) {
  var self = this;
  cb = cb || noop; 

  this.apis.emit('sre::' + user + '::app::update', app, function(err, result) {
    if (!err) {
      // add app to config file
      self.apis.config.set('sre:' + user + ':apps:' + app.name, app);
      self.apis.config.save();
    }
    cb(err, result);
  });
};


/**
 * (API) Stops and removes (an) application(s) from this Apiary System
 * @param {String} user User to clean the given application for
 * @param {Object} app Application description
 * @param {Function} cb (optional) Continuation function to respond to when complete
 */
CliServer.prototype.appClean = function(user, app, cb) {
  var self = this;
  cb = cb || noop; 

  this.apis.emit('sre::' + user + '::app::clean', app, function(err, result) {
    // add app to config file
    self.apis.config.clear('sre:' + user + ':apps:' + app.name);
    self.apis.config.save();
    cb(err, result);
  });
};


/**
 * (API) Lists all apps running on this Apiary System or running for given user
 * @param {String} user (optional) User to list the applications for or `all` for all users
 * @param {Function} cb (optional) Continuation function to respond to when complete
 */
CliServer.prototype.appList = function(user, cb) {
  if (!cb && typeof(user) == 'function') {
    cb = user;
    user = undefined;
  }
  cb = cb || noop; 

  this.apis.emit('sre::' + user + '::app::list', user, function(err, result) {
    cb(err, result);
  });
};


/**
 * (API) Add user to the running Apiary System
 * @param {String} user User to add
 * @param {Function} cb (optional) Continuation function to respond to when complete
 */
CliServer.prototype.userAdd = function(user, cb) {
  var self = this;
  cb = cb || noop;

  this.apis.emit('sre::service::get', user, function(err /* name */) {
    if (!err) return cb(new Error('Controller for user ' + user + ' is already running!'), user);

    // TODO: change user relation to system user, this can be different!!!
    var options = {
      name      : user,
      user      : user,
      directory : 'data',
      cwd       : '/home/' + user,
      uid       : user,
      gid       : user
    };

    // add user to config file
    self.apis.config.set('sre:' + user, options);
    self.apis.config.save();
    
    // and start the corresponding SREC
    self.apis.emit('sre::service::start', options, function(err, result) {
      cb(err, result);
    });
  });
};


/**
 * (API) Remove user from this running Apiary System
 * @param {String} user User to remove
 * @param {Function} cb (optional) Continuation function to respond to when complete
 */
CliServer.prototype.userRemove = function(user, cb) {
  var self = this;
  cb = cb || noop;

  this.apis.emit('sre::service::stop', user, 5000, function(err /* sre */) {
    // remove user from config file
    self.apis.config.clear('sre:' + user);
    self.apis.config.save();
    cb(err, user);
  });
};


/**
 * (API) Lists all users on this running Apiary System
 * @param {Function} cb (optional) Continuation function to respond to when complete
 */
CliServer.prototype.userList = function(cb) {
  cb = cb || noop;

  cb(null, this.apis.config.get('sre'));
};


/**
 * (API) Stops apps and removes a user from this Apiary System
 * @param {String} user User to clean
 * @param {Function} cb (optional) Continuation function to respond to when complete
 */
CliServer.prototype.userClean = function(user, cb) {
  user = user;
  cb = cb || noop;

  cb(new Error('userClean not yet implemented in Apiary API!'));
};