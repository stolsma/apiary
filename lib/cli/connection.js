/**
 * connection.js: A Broadway plugin capable of setting up a configuration channel to a running Apiary system.
 *
 * Copyright 2011-2012 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path          = require('path'),
    inherits      = require('util').inherits,
    EventEmitter2 = require('eventemitter2').EventEmitter2,
    dnode         = require('dnode'),
    app           = require('../cli');

var client = exports;


/**
 * Define connected checking function
 * @param {Function} cb Callbck to continue with if no connection
 */
client.connected = function(cb) {
  var connected = (client.session && client.session.connected);
  
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
client.connect = function(cliSocket, cb) {
  function connected(session /* api */) {
    client.session = session;
    app.log.info('Apiary System running! Connected on socket: ' + cliSocket.magenta);
    cb();
  }

  function notConnected(err, cause) {
    if (err) {
      app.log.warn('Problem connecting to the Apiary System!');
      cb(err);
    } 
    else if (cause == 'EACCES') {
      app.log.warn('Not enough privileges to connect to the requested Apiary System!');
      cb(err);
    }
    else {
      app.log.warn('No Apiary System running!'.red);
      cb();
    }
  }
  
  cliSocket = cliSocket || path.join(app.config.get('cli:socketPatch'), app.config.get('cli:socketFile'));
  getClient(cliSocket, connected, notConnected);
};


/**
 * Create a CLI client connection to the running Apiary System (if any!)
 * @param (String} cliSocket The socket to try to connect to
 * @param {Function} connected Function to call when there is a connection with a running Apiary System
 * @param {Function} notConnected Function to call when it wasn't possible to connect to an Apiary System
 * @return {CliClient} Returns a cliClient instance that tries to connect
 */
function getClient(cliSocket, connected, notConnected) {
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
}


/**
 * The Cli Client class definition
 * @class CliClient
 * @extends EventEmitter2
 *
 * @constructor
 * Create CLI Client class
 * @param {Object} options CliClient config options:
 */
var CliClient = function(options) {
  // if called as function return Instance
  if (!(this instanceof CliClient)) return new CliClient(options);

  // call parent EventEmitter2 contructor
  EventEmitter2.call(this, options);

  // set default options
  options = options || {};
  this.socket = options.cliSocket || null;

  // not connected yet!!
  this.connected = false;
};
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