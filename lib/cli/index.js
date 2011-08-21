/**
 * index.js: Commands for the main resource in the apiary CLI.
 *
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	fs = require('fs'),
	colors = require('colors'),

	// own modules
	apiary = require('../apiary');
	
var root = path.join(process.env.HOME || '/root', '.apiary');

module.exports = function setupConfig(app) {
	/**
	 * Starts an Apiary system in this process
	 */
	app.cli('/startdirect', function start(cmd, tty) {
		apiary.start();
	});
  
	/**
	 * Starts an daemonized Apiary system
	 */
	app.cli('/start', function start(cmd, tty) {
		var monitor;
		
		tty.info('Starting the Apiary system!'.magenta);
		monitor = apiary.utils.daemonize(root, false, path.join(__dirname, '..', '..', 'bin', 'apiary'), ['startdirect']);
		
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
		
		tty.info('The Apiary system is started!'.magenta);
	});
  
	app.usage('/start', function startUsage(cmd, tty) {
		tty.info('');
		tty.info('apiary start'.green);
		tty.info('  Starts the Apiary System. This command must be executed as root ([sudo])');
		tty.info('  See `apiary config -h` for more configuration details');
	});

	/**
	 * Cleanly stops the running Apiary system
	 */
	app.cli('/stop', function stop(cmd, tty) {
		// read pidfile for pid of forever deamon and use that to send SIGINT
		fs.readFile(path.join(root, 'pids', 'apiary.pid'), function(err, pid) {
			if (err) throw err;
			tty.info('Pid is: ' + pid);
			// Signal the apiary system monitor to stop safely
			process.kill(pid, 'SIGINT');
		});
	});
  
	app.usage('/stop', function stopUsage(cmd, tty) {
		tty.info('');
		tty.info('apiary stop'.green);
		tty.info('  Stops the Apiary System. This command must be executed as root ([sudo])');
		tty.info('  See `apiary config -h` for more configuration details');
	});

	/**
	 * Middleware executed before the cli router!!
	 */	
	app.use(function(cmd, tty, next) {
		tty.info('Using config file ' + cmd.config.store.file.magenta);
	
		try {
			var app = JSON.parse(fs.readFileSync('package.json'));
			var deploymentscript = cmd.config.get('f') || cmd.config.get('file') || 'deploy.json';
			try {
				var deployment = JSON.parse(fs.readFileSync(deploymentscript));
				tty.info('Deployment script is ' + fs.realpathSync(deploymentscript).magenta);
				['repository', 'name', 'domain', 'subdomain', 'env', 'user'].forEach(function(item) {
					if (deployment.hasOwnProperty(item)) {
						app[item] = deployment[item];
					}
				})
				if (!app.user) {
					app.user = cmd.config.get('user');
				}
			}
			catch (e) {
				tty.warn('No deployment script was detected');
			}
			cmd.app = app;
		} 
		catch (e) {
			if (e.name === 'SyntaxError') {
				tty.error('Unable to read deployment configuration.');
				process.exit(1);
				return;
			}
			cmd.app = {};
		}
	
		var clientsettings = {
			host: cmd.config.get('a') || cmd.config.get('address'),
			port: cmd.config.get('p') || cmd.config.get('port')
		};
	
		tty.info('Apiary System Controller located at ' + (clientsettings.host + ':' + clientsettings.port).magenta);
	//	cmd.client = new haibu.drone.Client(clientsettings);
	
		// and go to next middeware router
		next();
	});

	/**
	 * Standard usage info when nothing executes...
	 */
	app.usage(function usage(cmd, tty) {
		tty.info('');
		tty.info('apiary'.bold.underline);
		tty.info('  CLI interface to manage an Apiary System.');
		tty.info('  Please refer to documentation of commands using `-h` or `--help`.');
		tty.info('');
		tty.info('commands'.bold);
		tty.info('  apiary start'.green);
		tty.info('  apiary stop'.green);
		tty.info('  apiary apps'.green);
		tty.info('  apiary config'.green);
		tty.info('');
		tty.info('flags'.bold);
		tty.info('  -s --silent                Do not log to console');
		tty.info('');
	});
}