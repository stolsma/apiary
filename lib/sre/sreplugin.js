/**
 * Service Runtime Environment Controller plugin, thats a haibu plugin!
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var haibu = require('haibu');

var sreplugin = exports;

// Name this plugin so it can be accessed by name
sreplugin.name = 'sreplugin';

//
// ### function init (options, callback) 
// #### @options {Object} Options to initialize this plugin with
// #### @callback {function} Continuation to respond to when complete
// Initalizes the `sreplugin` plugin in the current `haibu` environment. 
//
sreplugin.init = function (options, callback) {
	options = options || {};
	callback = callback || function () { };

	return callback();	  
};

//
// ### function argv (repo) 
// #### @repo {Repository} Code repository we are spawning from
// Returns the appropriate spawn options for the `haibu.Spawner` for 
// the `repo` along with extra `sreplugin` options. 
//
sreplugin.argv = function (repo) {
	return {
		argv: [
			'--hook-name',
			repo.app.name,
			'--hook-host',
			'localhost',
			'--hook-port',
			haibu.running.hook['hook-port']
		]
	};
};