/**
 * utils.js: General functions for the Apiary CLI.
 *
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	fs = require('fs'),
	color = require('colors');

var CliServer = require('./server'),
	CliClient = require('./client');

/**
 * Start the Apiary System and CLI Server with given options
 * @param {Object} options Apiary configuration options
 * @param {String} cliSocket The cliServer socket to use
 * @param {Function} cb Callbck to continue with (err, cliServer)
 */
exports.start = function(options, cliSocket, cb) {
	var apiary = require('../apiary');

	// create a CliServer instance and start listening on the given socket
	apiary.cliServer = CliServer(apiary).listen(cliSocket, function(err) {
		// return err (can also be undefined or null) and the created cliServer		
		cb(err, apiary.cliServer);
	});

	// and start the Apiary System with the given options
	apiary.start(options, function(err) {
		if (err) return cb(err);
	});
}

/**
 * 
 */
exports.stop = function(cliClient, root, cb) {
	// read pidfile for pid of forever deamon and use that to send SIGINT
	fs.readFile(path.join(root, 'pids', 'apiary.pid'), function(err, pid) {

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
 * @param {String} root Location of the control files (path)
 * @param {Boolean} silent Must the forver proces log (error) messages to a file  
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
 * @param {String} root Location of the control files (path)
 * @param {Boolean} silent Must the forver proces log (error) messages to a file  
 * @param {String} script Script to start as seperate process
 * @param {Array} scriptOptions Arguments for the script to start
 * @return {forever.Monitor} A forever monitor instance
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
 * Clean the filesystem of all files produced by a running Apiary System
 * @param {String} root Location of the system files
 * @param {Function} cb Callback function being called when ready
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