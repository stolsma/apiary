/**
 * connection.js: A Broadway plugin capable of setting up a configuration channel to a running Apiary system.
 *
 * Copyright 2011-2012 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path          = require('path'),
    inherits      = require('util').inherits,
    EventEmitter2 = require('eventemitter2').EventEmitter2,
    dnode         = require('dnode');

var client = exports;

// The name of this Broadway plugin
client.name = 'apiaryConnection';

/**
 * Called with plugin options once plugin attached to application
 * `this` - is a reference to application
 */
client.attach = function attach(options) {
};

/**
 * Called when plugin detached from application (Only if plugin with same name was attached)
 * `this` - is a reference to application
 */
client.detach = function detach() {
};

/**
 * Called on application initialization
 * App#init(callback) will be called once every plugin will call `callback`
 * `this` - is a reference to application
 */
client.init = function init(callback) {
  this.client = new Connection(this);
  callback();
};


/**
 * The Server Connection class definition
 * @class Connection
 *
 * @constructor
 * Create Connection class
 * @param {Broadway} app Broadway app this plugin needs to be installed in
 */
function Connection(app) {
  this.session = null;
  this.app = app;
}


/**
 * Is this connection connected to an Apiary System
 * @param {Function} cb Callbck to continue with if no connection (Error String)
 */
Connection.prototype.connected = function(cb) {
  var connected = (this.session && this.session.connected);
  
  // if error callback is given call it with string
  if (!connected && cb) {
    cb('No Apiary System running!');
  }
  
  return connected;
};


/**
 * try to connect to a running Apiary System
 * @param {Function} cb Callbck to continue with (err)
 */
Connection.prototype.connect = function(cliSocket, cb) {
  var self = this;
  
  function connected(session /* api */) {
    client.session = session;
    self.app.log.info('Apiary System running! Connected on socket: ' + cliSocket.magenta);
    cb();
  }

  function notConnected(err, cause) {
    if (err) {
      self.log.warn('Problem connecting to the Apiary System!');
      cb(err);
    } 
    else if (cause == 'EACCES') {
      self.log.warn('Not enough privileges to connect to the requested Apiary System!');
      cb(err);
    }
    else {
      self.app.log.warn('No Apiary System running!'.red);
      cb();
    }
  }
  
  cliSocket = cliSocket || path.join(self.app.config.get('cli:socketPatch'), self.app.config.get('cli:socketFile'));
  this.getClient(cliSocket, connected, notConnected);
};


/**
 * Create a CLI client connection to the running Apiary System (if any!)
 * @param (String} cliSocket The socket to try to connect to
 * @param {Function} connected Function to call when there is a connection with a running Apiary System
 * @param {Function} notConnected Function to call when it wasn't possible to connect to an Apiary System
 * @return {CliClient} Returns a cliClient instance that tries to connect
 */
Connection.prototype.getClient = function(cliSocket, connected, notConnected) {
  // create client and connect to given socket
  var client = CliClient().connect(cliSocket);

  function error(err) {
    // remove listeners
    client.removeListener('error', error);
    client.removeListener('connected', connect);

    // check type of error (ENOENT = socket doesn't exist, EACCES = no privileges to connect to socket)
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOENT' || err.code === 'EACCES') {
      // no client connection possible
      return notConnected(null, err.code);
    }

    // don't know this error so assume not connected
    return notConnected(err);
  }

  function connect(api) {
    // remove listeners
    client.removeListener('error', error);
    client.removeListener('connected', connect);

    // and call callback with the required arguments
    connected(client, api);
  }

  // add listening functions
  client.on('connected', connect);
  client.on('error', error);

  // make other handling possible
  return client;
};


/**
 * The Cli Client class definition
 * @class CliClient
 * @extends EventEmitter2
 *
 * @constructor
 * Create CLI Client class
 * @param {Object} options CliClient config options:
 */
function CliClient(options) {
  // if called as function return Instance
  if (!(this instanceof CliClient)) return new CliClient(options);

  // call parent EventEmitter2 contructor
  EventEmitter2.call(this, options);

  // set default options
  options = options || {};
  this.socket = options.cliSocket || null;

  // not connected yet!!
  this.connected = false;
}
inherits(CliClient, EventEmitter2);


/**
 * Connect to the given CLI Socket 
 * @param {String} socket (optional) Socket to connect to
 * @return {CliClient} This cliClient instance, makes linking possible
 */
CliClient.prototype.connect = function(socket) {
  var self = this;

  // check arguments
  if (typeof(socket) == 'function') {
    socket = this.socket || null;
  }

  // Connect to the CLI server on the given socket
  this.client = dnode.connect(socket, function (remote, conn) {
    // add connection listening events
    conn.once('end', function() {
      self.conn = null;
      self.remote = null;
      self.connected = false;
      self.emit('disconnected');
    });

    // Save remote CLI API functions, set to connected and emit 'connected' event
    self.conn = conn;
    self.remote = remote;
    self.connected = true;
    self.emit('connected', remote);
  });

  // relay error events
  this.client.on('error', function (err) {
    self.emit('error', err);
  });

  return this;
};


CliClient.prototype.end = function() {
  // end connection to the Apiary System
  this.conn.end();
};