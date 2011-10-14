/**
 * utils.js: General functions for the Apiary CLI.
 *
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	fs = require('fs'),
	color = require('colors');

var apiaryUtils = require('../core/utils'),
	CliServer = require('../sc/apis/cliserver'),
	CliClient = require('./api/client');

/**
 * Create a default CLI configuration object based from the given base location
 * @params {String} base Base directory for all Apiary files
 * @returns (Object) Created default configuration object
 */	
exports.createDefaultConfig = function(base) {
	return {
		apiary: {
//			socket: path.join(base, 'socket'),			// location of the SRE and SS socket files
			config: {
				file: path.join(base, 'apiary.json'),	// location of the general apiary configuration file
			}
		},
		cli: {
			root: base,									// root of all the apiary related files
			forever: path.join(base, '4evr'),			// location of forever daemonizing control files
			logs: {
				root: path.join(base, 'logs'),			// Generic log root directory, specific location paramaters will prefer
				forever: path.join(base, '4evr'),		// Path to log output from forever process (when daemonized)
				foreverFile: 'apiary.4evr',				// File forever will write forever process stdout and stderr to.
//				stdout: path.join(base, 'logs'),		// Path to log output from child stdout
				stdoutFile: 'apiary.log',				// File forever will write child process stdout to.
//				stderr: path.join(base, 'logs'),		// Path to log output from child stderr
				stderrFile: 'apiary.err'				// File forever will write child process stderr to.
			},
			socket: path.join(base, 'socket'),
			socketFile: 'apiary.socket'
		}
	}
}

/**
 * Start the Apiary System and CLI Server with given options
 * @param {Object} options Apiary configuration options
 * @param {String} cliSocket The cliServer socket to use
 * @param {Function} cb Callbck to continue with (err, cliServer)
 */
exports.start = function(options, socket, socketFile, cb) {
	var apiary = require('../apiary');

	// create a CliServer instance and start listening on the given socket
	apiary.cliServer = CliServer().listen(path.join(socket, socketFile), function(err) {
		// return err (can also be undefined or null) and the created cliServer		
		cb(err, apiary.cliServer);
	});
	
	// location of the SRE and SS socket files
	options.socket = options.socket || socket;

	// and start the Apiary System with the given options
	apiary.start(options, function(err) {
		if (err) return cb(err);
		cb();
	});
}

/**
 * 
 */
exports.stop = function(cliClient, dirs, cb) {
	// read pidfile for pid of forever deamon and use that to send SIGINT
	fs.readFile(path.join(dirs.forever, 'apiary.pid'), function(err, pid) {

		function cliKill() {
			cliClient.remote.getServerPid(function(pid) {
				killProcess(pid, cb);
			});
		}
		
		function killProcess(pid, cb) {
			// Signal the apiary system monitor to stop safely
			try {
				process.kill(pid, 'SIGINT');
			}
			catch (err) {
				return cb(err, pid);
			}
			cb(null, pid);
		}

		return (err) ? 
			cliKill() :
			killProcess(pid, function(err) {
				return (err) ?
					cliKill() :
					cb(null, pid);
			});
	});
}

/**
 * Start the Apiary System with a daemonized control proces (using forever) process
 * @param {Object} dirs Location of the control files (path)
 * @param {Boolean} silent Must the forver proces log (error) messages to a file  
 */
exports.startDaemonized = function(dirs, silent) {
	var	monitor = daemonize(dirs, silent, path.join(__dirname, '..', '..', 'bin', 'apiary'), ['start', 'direct']);

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
 * @param {Object} dirs Location of the control files (path)
 * @param {Boolean} silent Must the forver proces log (error) messages to a file  
 * @param {String} script Script to start as seperate process
 * @param {Array} scriptOptions Arguments for the script to start
 * @return {forever.Monitor} A forever monitor instance
 */
function daemonize(dirs, silent, script, scriptOptions) {
	var forever = require('forever'),
		foreverOptions = {
			root: dirs.forever,
			pidPath: dirs.forever,
			sockPath: dirs.forever,
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
			'logFile': path.join(dirs.logs.forever || dirs.logs.root, dirs.logs.foreverFile),	// Path to log output from forever process (when daemonized)
			'outFile': path.join(dirs.logs.stdout || dirs.logs.root, dirs.logs.stdoutFile),	// Path to log output from child stdout
			'errFile': path.join(dirs.logs.stderr || dirs.logs.root, dirs.logs.stderrFile)	// Path to log output from child stderr
		};

	// setup forever with the correct config
	forever.load(foreverOptions);
	// deamonize this process and start apiary with given options
	return forever.startDaemon(script, foreverSpawnOptions);
}

/**
 * Create a CLI client connection to the running Apiary System (if any!)
 * @param (String} cliSocket The socket to try to connect to
 * @param {Function} connected Function to call when there is a connection with a running Apiary System 
 * @param {Function} notConnected Function to call when it wasn't possible to connect to an Apiary System 
 * @return {CliClient} Returns a cliClient instance that tries to connect 
 */
exports.getClient = function(cliSocket, connected, notConnected) {
	// create client and connect to given socket
	var client = CliClient().connect(cliSocket);

	function error(err) {
		// remove listeners
		client.removeListener('error', error);
		client.removeListener('connected', connect);

		// check type of error (ENOENT = socket doesn't exist, EACCES = no privileges to connect to socket)
		if (err.code === 'ECONNREFUSED' || err.code === 'ENOENT' || err.code === 'EACCES') {
			// no client connection possible, so return only client
			return notConnected(null, client, err.code);
		}

		// don't know this error so assume not connected
		return notConnected(err, client);
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


/**
 * Create an array of directories from a given config. used by createDirs and cleanDirs
 * @private 
 */
function dirList(config) {
	var confAttr = ['root', 'forever', 'logs.root', 'logs.forever', 'logs.stdout', 'logs.stderr', 'socket'],
		dirs = [], props, i, check;
		
	confAttr.forEach(function(key) {
		props = key.split('.');
		check = config;
		for (i = 0; i < props.length; i++) {
			if (typeof(check[props[i]]) == 'undefined') break;
			check = check[props[i]];
			if (i == props.length-1) dirs.push(check);
		}
	});
	
	return dirs;
}
	
/**
 * Create all directories given in de config object with uid and gid. 
 * @param {Object} config CLI config with directorie paths to initialize
 * @param {Integer} uid Uid of the directory to create
 * @param {Integer} gid Gid of the directory to create
 * @param {function} callback Continuation to respond to when complete
 */
exports.createDirs = function(config, uid, gid, cb) {
	var options = {
		mode: 0775,
		uid: uid,
		gid: gid		
	};
	apiaryUtils.directories.create(dirList(config), options, cb);
}

/**
 * Clean the filesystem of all files produced by a running Apiary System
 * @param {Object} config CLI config with directorie paths to delete
 * @param {Function} cb Callback function being called when ready
 */
exports.cleanDirs = function(config, cb) {
	apiaryUtils.directories.remove(dirList(config), cb);
}

/**
 * Process returned users list
 */
exports.processUserList = function(list, tty) {
	var rows = [['user']],
		colors = ['green'];
					
	for (var user in list) {
		rows.push([
			user
		]);
	}
	
	tty.info('');
	if (rows.length === 1) {
		tty.info("No users found.");
	} else {
		tty.info('Users:');
		tty.info('');
		tty.putRows('data', rows, colors);
	}
	tty.info('');
}

/**
 * Process returned app list
 */
exports.processAppList = function(list, tty) {
	var rows = [['user', 'app', 'domains', 'address', 'pid']],
		colors = ['green', 'yellow', 'red', 'magenta', 'magenta'];
					
	for (var user in list) {
		var appDrones = list[user];
		for (var app in appDrones) {
			var appInfo = appDrones[app].app;
			var drones = appDrones[app].drones;
			drones.forEach(function (drone) {
				rows.push([
					user,
					app,
					(appInfo.domains || [appInfo.domain]).map(function(item) {
						return item ? item : 'undefined'.blue;
					}).join(' & '),
					drone.host + ':' + drone.port,
					drone.pid
				]);
			});
		}
	}
	
	tty.info('');
	if (rows.length === 1) {
		tty.info("No applications found.");
	} else {
		tty.info('Applications:');
		tty.info('');
		tty.putRows('data', rows, colors);
	}
	tty.info('');
}

/**
 * Get the status of the running Apiary System
 */
exports.status = function(cb) {
	cb();
}

/**
 * Put the banner on given output
 */
exports.banner = function(tty) {
	var welcome = [
			'',
			'     ___      .______    __       ___      .______    ____    ____ ', 
			'    /   \\     |   _  \\  |  |     /   \\     |   _  \\   \\   \\  /   / ',
			'   /  ^  \\    |  |_)  | |  |    /  ^  \\    |  |_)  |   \\   \\/   /  ',
			'  /  /_\\  \\   |   ___/  |  |   /  /_\\  \\   |      /     \\_    _/   ',
			' /  _____  \\  |  |      |  |  /  _____  \\  |  |\\  \\-.     |  |     ',
			'/__/     \\__\\ | _|      |__| /__/     \\__\\ | _| `.__|     |__|     ',
			''
		].join('\n');

	tty.info(welcome.green);
}