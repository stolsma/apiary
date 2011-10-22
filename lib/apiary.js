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
 * @param {Boolean} exit Also call process.exit(0) (default is true)
 * @param {Function} cb Callback to call when ready; Callback will be called with (err)
 */
apiary.stop = function stop(exit, cb) {
	exit = exit || true;
	cb = cb || function(){};
	
	// call the SC to stop itself and its subsystems gracefully
	apiary.Sc.prototype.stop.call(apiary, function(errList) {
		if (exit) {
			// to get all events processed: on nextTick exit this process
			process.nextTick(function () {
				process.exit(0);
			});
		}
		cb(errList);
	});
}


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

	apiary.config.init(options, function (err) {
		if (err) {
			return cb(err);
		}

		// startup logger
		apiary.logger = apiary.Logging(apiary.config.get('logging'));
	
		// Do some signal handling for SIGINT/ctrl-c (only react to it once!!!)
		process.once('SIGINT', apiary.stop.bind(apiary, true));

		// initialized and call callback
		apiary.initialized = true;
		cb();
	});
};