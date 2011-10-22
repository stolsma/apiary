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
	CliClient = require('./api/client');

/**
 * Create a default CLI configuration object based from the given base location
 * @params {String} base Base directory for all Apiary files
 * @returns (Object) Created default configuration object
 */	
exports.createDefaultConfig = function(base) {
	return {
		apiary: {
			config: {
				file: path.join(base, 'apiary.json'),	// location of the general apiary configuration file
			}
		},
		cli: {
			root: base,									// root of all the apiary related files
			forever: path.join(base, '4evr'),			// location of forever daemonizing control files
			pidFile: 'apiary.pid',						// name of the pid locking file for the daemonized startup
			logs: {
				root: path.join(base, 'logs'),			// Generic log root directory, specific location paramaters will prefer
				forever: path.join(base, '4evr'),		// Path to log output from forever process (when daemonized)
				foreverFile: 'apiary.4evr',				// File forever will write forever process stdout and stderr to.
//				stdout: path.join(base, 'logs'),		// Path to log output from child stdout
				stdoutFile: 'apiary.stdout',			// File forever will write child process stdout to.
//				stderr: path.join(base, 'logs'),		// Path to log output from child stderr
				stderrFile: 'apiary.stderr'				// File forever will write child process stderr to.
			},
			socket: path.join(base, 'socket'),
			socketFile: 'apiary.socket'
		}
	}
}


/**
 * Start the Apiary System with given options and logging to stdout and stderr
 * @param {Object} config Apiary CLI configuration option store
 * @param {Function} cb Callbck to continue with (err)
 */
exports.start = function(config, cb) {
	var Child = require('intercom').EventChild,
		options = {
			apiaryOptions	: config.get('apiary'),
			socket 			: config.get('cli:socket'),
			socketFile		: config.get('cli:socketFile'),
			logs			: config.get('cli:logs:root')
		},
		forkOptions = {
			visible: true,
			forever: true,
			minUptime: 2000,					// Minimum time a child process has to be up. Forever will 'exit' otherwise.
			spinSleepTime: 1000,				// Interval between restarts if a child is spinning (i.e. alive < minUptime).
			cwd: process.cwd(),
			options: [],						// Additional arguments to pass to the script,
			spawnWith: {
				setsid: true					// new process group? (for signal sharing)
			}
		};
		
	cb = cb || function(){}

	// start the main Apiary process
	var child = Child(path.join(__dirname, 'startup', 'apiarywrap.js'), forkOptions);
	
	child.on('stdout', function(txt) {
	  console.log(new Date() + txt.toString());
	});
	
	child.on('stderr', function(txt) {
	  console.error(new Date() + txt.toString());
	});
	
	// listen for callback info by using a random callback event of 60/6 = 10 characters
	var cbEvent = apiaryUtils.randomString(60) + '::ready';
	// actions to execute when the Service is indicating that its initialized and running
	child.on(cbEvent, function(data) {
		cb();
	});
	
	// actions to execute when event communication is ready
	child.on('rpcready', function() {
		var childData = child.data;
		// give the new Apiary process its configuration to initialize with
		child.emit('child::start', options, cbEvent);
	});
	
	// Do some signal handling for SIGINT/ctrl-c (only react to it once!!!)
	process.once('SIGINT', function() {
		// listen for callback info by using a random callback event of 60/6 = 10 characters
		var cbEvent = apiaryUtils.randomString(60) + '::ready';
		// actions to execute when the Service is indicating that its initialized and running
		child.once(cbEvent, function(data) {
			child.stop();
			process.exit(0);
		});
	
		// stop the Apiary process
		child.emit('child::stop', cbEvent);
	});

	// start the Apiary process
	child.start();
}


/**
 * Start the Apiary System with a daemonized CLI control proces and logging to
 * path.join(config.logs.root/forever, config.logs.foreverFile)
 * @param {Object} config Apiary CLI configuration option store
 */
exports.startDaemonized = function(config) {
	var	daemon = require('daemon'),
		logFile = path.join(config.get('cli:logs:forever') || config.get('cli:logs:root'), config.get('cli:logs:foreverFile')),
		pidFile = path.join(config.get('cli:forever'), config.get('cli:pidFile'));
	
	// let the CLI do its job and with next tick daemonize and start Apiary
	process.nextTick(function() {
		var fd = fs.openSync(logFile, 'a+');
			
		daemon.start(fd);
		daemon.lock(pidFile);
			
		process.on('exit', function () {
		  fs.unlinkSync(pidFile);
		});
		
		// start the main Apiary process
		exports.start(config);
	});
}


/**
 * Read pidfile for pid of the CLI daemon and use that to send SIGINT and stop
 * the running Apiary system
 */
exports.stop = function(cliClient, dirs, cb) {
	fs.readFile(path.join(dirs.forever, dirs.pidFile), function(err, pid) {

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