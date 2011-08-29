/**
 * apiary: spawn multi-system multi-user node.js clouds, on your own hardware and/or with 3rd party virtual servers
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var inspect = require('util').inspect,
	EventEmitter2 = require('eventemitter2').EventEmitter2,
	async = require('async');

var apiary = module.exports = new EventEmitter2({
		delimiter: '::',
		wildcard: true
	});

apiary.config = require('./core/config');
apiary.Sec = require('./sec');
apiary.Sc = require('./sc');
apiary.Sre = require('./sre');
apiary.utils = require('./utils');
apiary.initialized = false;

/**
 * Start the Apiary System
 * @param {Object} options For options.system see apiary.init
 * @param {Function} cb Callback to call when ready (err)
 */
apiary.start = function start(options, cb) {
	options = options || {};
	options.sre = options.sre || {};
	cb = cb || function(){};
	
	// Initialize clean Apiary System
	apiary.init(options, function(err) {
		
		function startSre(user, next) {
			
			function startApp(app, next) {
				var appOpt = options.apps[app];
				appOpt.user = user;
				appOpt.name = app;
				apiary.sc.startApp(appOpt, next);
			}
			
			function startApps(err, result) {
				if (options.apps) {
					async.forEach(Object.keys(options.apps), startApp, next);
				} else
					next(err, result);
			}
			
			var options = apiary.config.get('sre:' + user);
			options.user = user;
			apiary.sc.startSre(options, startApps);
		}
		
		// start for the given system users a SRE
		async.forEach(Object.keys(apiary.config.get('sre')), startSre, cb);
	});
};

/**
 * Stop execution of Apiary System in a clean way
 * @param {Function} cb Callback to call when ready; Callback will be called with (err, [result]...)
 */
apiary.stop = function stop(cb) {
	cb = cb || function(){};
	
	// call the SC to stop itself and its SRE children gracefully
	this.sc.stop(function(errList) {
		cb(errList);
		// to get all events processed: on nextTick exit this process
		process.nextTick(function () {
			process.exit(0);
		});
	});
}

/**
 * Initialize the Apiary environment
 * @param {Object} options
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

		// create System Controller
		apiary.sc = apiary.Sc();

		// TODO: change temporary event logging to definitive implementation
		apiary.onAny(function (data) {
			console.log('apiary::' + this.event.toString() + '    ' + inspect(data))
		});

		// Do some signal handling for SIGINT/ctrl-c (only react to it once!!!)
		process.once('SIGINT', apiary.stop.bind(apiary));

		// initialized and call callback
		apiary.initialized = true;
		cb();
	});
};