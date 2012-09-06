/**
 * connection.js: Setup a configuration channel to a running Apiary system.
 *
 * Copyright 2011-2012 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path      = require('path'),
    app       = require('./index-new'),
    CliClient = require('./api/client');


var client = exports;


// define connected checking function
client.connected = function() {
  return (client.session && client.session.connected);
};


// try to connect to a running Apiary System
client.connect = function(cb) {
  function connected(session /* api */) {
    client.session = session;
    app.log.info('Apiary System running! Connected on socket: ' + cliSocket.magenta);
    cb();
  }

  function notConnected(err, cause) {
    if (err) {
      app.log.warn('Problem connecting to the Apiary System!', err);
    } 
    else if (cause == 'EACCES') {
      app.log.warn('Not enough privileges to connect to the requested Apiary System!');
    }
    else {
      app.log.warn('No Apiary System running!'.red);
      cb();
    }
  }
  
  var cliSocket = path.join(app.config.get('cli:socket'), app.config.get('cli:socketFile'));
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