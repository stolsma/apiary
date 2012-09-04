/**
 * haibufix.js, realtime changes to haibu!
 *
 * Copyright 2012 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var fs = require('fs'),
    path = require('path');

module.exports = function(haibu) {

/*
  // Donkey punch Drone.prototype.clean because wrong app.user check
  // until all required patches for removing user notion in haibu, are pushed by Nodejitsu
  haibu.drone.Drone.prototype.clean = function (app, callback) {
    if (typeof(app.user) == 'undefined' || typeof(app.name) == 'undefined') {
      return callback(new Error('Both `user` and `name` are required.'));
    }

    var appsDir = haibu.config.get('directories:apps');

    this.stop(app.name, function (err, result) {
      //
      // Ignore errors and continue cleaning
      //
      haibu.utils.rmApp(appsDir, app, callback);
    });
  };

  // Donkey punch Spawner.prototype.spawn to add arguments support to haibu
  // until all required patches for arguments support in haibu are pushed by Nodejitsu
  //
  // ### function spawn (app, callback)
  // #### @repo {repository.Repository} App repository to attempt to spawn on this server.
  // #### @callback {function} Continuation passed to respond to.
  // spawns the appropriate carapace for an Application and bootstraps with the events listed
  //
  haibu.Spawner.prototype.spawn = function spawn (repo, callback) {};
*/

};