/**
 * apiary: spawn multi-system multi-user node.js clouds, on your own hardware and/or with 3rd party virtual servers
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @module apiary
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

// catch all non caugth exceptions so we can do something with it from the stderr logs or TTY!!
process.on('uncaughtException', function (err) {
	console.log('exception: ', err, err.stack)
	console.error('Caught exception: ', err);
	console.error('Caught exception: ', err.stack);
});

// create the underlying System Controller for this Apiary process
var apiary = module.exports = require('./sc')();

// and create the links to the important modules to make it possible to donkey punch classes/modules
apiary.utils = require('./core/utils');
apiary.config = require('./core/config');
apiary.Logging = require('./core/logging');
apiary.Controller = require('./core/controller');
apiary.Service = require('./core/service');
apiary.Sc = require('./sc');
apiary.Sre = require('./sre');
apiary.Sse = require('./sse');
apiary.Apie = require('./apie');
apiary.initialized = false;


/**
 * Start the Apiary System
 * @param {Object} options For options.system see apiary.init
 * @param {Function} cb Callback to call when ready (err)
 */
apiary.start = function start(options, cb) {
	options = options || {};
	cb = cb || function(){};

	// Initialize clean Apiary System
	apiary.init(options, function(err) {
		apiary.Sc.prototype.start.call(apiary, function(errList) {
			cb(errList);
		});
	});
};


/**
 * Stop execution of Apiary System in a clean way
 * @param {Function} cb Callback to call when ready; Callback will be called with (err)
 */
apiary.stop = function stop(cb) {
  apiary.logger.emit('event::sc::stoprequest');

  // call the SC to stop itself and its subsystems gracefully
  apiary.Sc.prototype.stop.call(apiary, function(errList) {
    // last log message!!!!
    apiary.logger.emit('event::sc::stoped', errList);

    // stop logging
    apiary.logger.stop(function () {
      return cb ? cb(errList): null;
    });
  });
};


/**
 * Initialize the Apiary environment
 * @param {Object} options Overriding configuration options
 * @param {Function} cb Callback to call when ready or error (err)
 */
apiary.init = function init(options, cb) {
  options = options || {};

  // Get config file and default configuration values
  if (apiary.initialized) {
    return cb();
  }

  function startLogger(err) {
    if (err) { return cb(err); }
    // startup logger
    apiary.logger = apiary.Logging(apiary.config.get('logging'));

    // initialized and call callback
    apiary.initialized = true;
    cb();
  }

  function createDirectories(err) {
    if (err) { return cb(err); }
    var dirs = [
      apiary.config.get('logging:location'),
      apiary.config.get('socket')
    ];
    apiary.utils.directories.create(dirs, {}, startLogger);
  }

  apiary.config.init(options, createDirectories);
};