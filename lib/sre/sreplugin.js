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

/**
 * Initalizes the `sreplugin` plugin in the current `haibu` environment.
 * Init is called by the haibu.use function. 
 * @param {Object} options Options to initialize this plugin with
 * @param {function} callback Continuation to call when complete
 */
sreplugin.init = function (options, callback) {
	return callback();	  
};

/**
 * Called by haibu Spawner to get extra spawn options 
 * @param {Repository} repo Code repository we are spawning from
 * @return Returns the appropriate spawn options for the `haibu.Spawner` for 
 * the `repo` along with extra `sreplugin` options. 
 */
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