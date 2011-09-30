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
sreplugin.init = function(options, callback) {
	return callback();	  
};

/**
 * Called by haibu Spawner to get extra spawn options 
 * @param {Repository} repo Code repository we are spawning from
 * @return Returns the appropriate spawn options for the `haibu.Spawner` for 
 * the `repo` along with extra `sreplugin` options. 
 */
sreplugin.argv = function(repo) {
	// TODO: Check if this can be done a lot easier....
	// check all script arguments for replacement strings and replace with appropriate variables
	var args = (repo.app.scripts && repo.app.scripts.arguments) ? repo.app.scripts.arguments : [],
		ss = '%', 
		replacements = {
			'h': process.env.HOME,
			'a': repo.appDir,
			'c': repo.homeDir
		};
	
	// if string then split to array
	args = (typeof args == 'string') ? args.split(' ') : args; 
	// replace all variable strings
	args.forEach(function(val, index) {
		var i, arg, repl;
		for (i = val.indexOf(ss); i != -1; i = val.indexOf(ss, i+1)) {
			arg = val[i+1];
			repl = (replacements[arg]) ? replacements[arg] : null;
			if (repl) val = val.replace(ss + arg, repl);
		}
		// put result back
		args[index] = val;
	});
	
	return {
		scriptArgs: args,
		argv: [
			'--hook-name',
			repo.app.name,
			'--hook-host',
			'127.0.0.1',
			'--hook-port',
			haibu.running.hook['hook-port']
		]
	};
};