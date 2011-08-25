/**
 * utils.js: General functions for the Apiary CLI.
 *
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	fs = require('fs');

/**
 *
 */
exports.start = function(cb) {
	var app1 = {
			"user": "haibu_user_1",
			"name": "test",
			"domain": "devjitsu.com",
			"repository": {
				"type": "git",
				"url": "https://github.com/Marak/hellonode.git",
			},
			"scripts": {
				"start": "server.js"
			}
		};
	var app2 = {
			"user": "haibu_user_2",
			"name": "test",
			"domain": "devjitsu.com",
			"repository": {
				"type": "git",
				"url": "https://github.com/Marak/hellonode.git",
			},
			"scripts": {
				"start": "server.js"
			}
		};

	var apiary = require('../apiary');
	apiary.start({
			sre: [{
				user: 'haibu_user_1'
			},{
				user: 'haibu_user_2'
			}]
		},
		function(err) {
			if (err) return cb(err);
			
			// following is only for test!!!
			apiary.sc.startApp(app1);
			apiary.sc.startApp(app2);
			
		}
	);
}

/**
 *
 */
exports.stop = function(root, cb) {
	// read pidfile for pid of forever deamon and use that to send SIGINT
	fs.readFile(path.join(root, 'pids', 'apiary.pid'), function(err, pid) {
		if (err) return cb(err);
		
		// Signal the apiary system monitor to stop safely
		try {
			process.kill(pid, 'SIGINT');
		}
		catch (err) {
			return cb(err);
		}
		
		cb(null, pid);
	});
}

/**
 *
 */
exports.startDaemonized = function(root, silent) {
	var	monitor = daemonize(root, silent, path.join(__dirname, '..', '..', 'bin', 'apiary'), ['start', 'direct']);
	
	// react on SIGINT signal by gracefully stopping the Apiary process
	process.once('SIGINT', function() {
		// indicate to forever that this process doesn't need to restart if it stops!!
		monitor.forever = false;
		monitor.forceStop = true;
		monitor.on('exit', function(){
			// to get all events processed: on nextTick exit this process
			process.nextTick(function () {
				process.exit(0);
			});
		});
		// kill the apiary system nicely by signalling
		process.kill(monitor.child.pid, 'SIGINT');
	});
}

/**
 * Daemonize current process and startup Apiary as controlled process 
 */
function daemonize(root, silent, script, scriptOptions) {
	var forever = require('forever'),
		foreverOptions = {
			root: root,
			pidPath: path.join(root, 'pids'),
			sockPath: path.join(root, 'sock'),
			columns: ['uid', 'command', 'script', 'forever', 'pid', 'logfile', 'uptime'],
			debug: false
		},
		foreverSpawnOptions = {
			'silent': silent,			// Silences the output from stdout and stderr in the parent process
			'uid': 'apiary',			// Custom uid for this forever process. (default: autogen)
			'minUptime': 2000,			// Minimum time a child process has to be up. Forever will 'exit' otherwise.
			'spinSleepTime': 1000,		// Interval between restarts if a child is spinning (i.e. alive < minUptime).
			'options': scriptOptions || [],	// Additional arguments to pass to the script,
			'spawnWith': {
			  setsid: true				// new process group? (for signal sharing)
			},
			'cwd': process.cwd(),
			'logFile': path.join(root, 'apiary.4evr'),	// Path to log output from forever process (when daemonized)
			'outFile': path.join(root, 'apiary.log'),	// Path to log output from child stdout
			'errFile': path.join(root, 'apiary.err')	// Path to log output from child stderr
		};

	// setup forever with the correct config
	forever.load(foreverOptions);
	// deamonize this process and start apiary with given options
	return forever.startDaemon(script, foreverSpawnOptions);
}

/**
 *
 */
exports.getClient = function(cliSocket, cb) {
	var client = { start: function(){} };
	
	cb(null, client);
}
			
/**
 *
 */
exports.clean = function(root, cb) {
	var result = [];
	try {
		fs.readdirSync(root).forEach(function(filename) {
			if (!filename.indexOf('apiary')) {
				fs.unlinkSync(path.join(root, filename));
				result.push(filename);
			}
		})
	} 
	catch (err) {
		return cb(err, result);
	}
	
	cb(null, result);
}

/**
 *
 */
exports.status = function(cb) {
	cb();
}