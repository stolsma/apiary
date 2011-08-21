/**
 * Utility functions for Apiary implementations
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var path = require('path'),
	forever = require('forever');

// export utils functions
var utils = exports;

/**
 * Daemonize current process and startup Apiary as controlled process 
 */
utils.daemonize = function(root, silent, script, scriptOptions) {
	var foreverOptions = {
			root: root,
			pidPath: path.join(root, 'pids'),
			sockPath: path.join(root, 'sock'),
			columns: ['uid', 'command', 'script', 'forever', 'pid', 'logfile', 'uptime'],
			debug: false
		},
		foreverSpawnOptions = {
			// Basic configuration options
			'silent': silent,			// Silences the output from stdout and stderr in the parent process
//			'forever': true,			// Indicates that this script should run forever
			'uid': 'apiary',			// Custom uid for this forever process. (default: autogen)
//			'pidFile': 'path/to/a.pid',	// Path to put pid information for the process(es) started
//			'max': 10,					// Sets the maximum number of times a given script should run

			// These options control how quickly forever restarts a child process
			// as well as when to kill a "spinning" process
			'minUptime': 2000,			// Minimum time a child process has to be up. Forever will 'exit' otherwise.
			'spinSleepTime': 1000,		// Interval between restarts if a child is spinning (i.e. alive < minUptime).

			// Command to spawn as well as options and other vars 
			// (env, cwd, etc) to pass along
			'options': scriptOptions || [],	// Additional arguments to pass to the script,
//			'sourceDir': 'script/path',		// Directory that the source script is in

			// All or nothing options passed along to `child_process.spawn`.
			'spawnWith': {
//			  env: process.env,			// Information passed along to the child process
//			  customFds: [-1, -1, -1],	// that forever spawns.
			  setsid: true				// new process group? (for signal sharing)
			},

			// More specific options to pass along to `child_process.spawn` which 
			// will override anything passed to the `spawnWith` option
//			'env': {},
			'cwd': process.cwd(),

			// Log files and associated logging options for this instance
			'logFile': path.join(root, 'apiary.4evr'),	// Path to log output from forever process (when daemonized)
			'outFile': path.join(root, 'apiary.log'),	// Path to log output from child stdout
			'errFile': path.join(root, 'apiary.err')	// Path to log output from child stderr
		};

	// setup forever with the correct config
	forever.load(foreverOptions);
	// deamonize this process and start apiary with given options
	return forever.startDaemon(script, foreverSpawnOptions);
}