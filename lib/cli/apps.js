/*
 * apps.js: Commands for the `apps` resource in the apiary CLI.
 *
 * (C) 2010, Nodejitsu Inc.
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 */
 
var colors = require('colors'),
	eyes = require('eyes');

module.exports = function setupApps(app) {
	app.usage('/apps', function config(cmd, tty) {
		tty.info('');
		tty.info('apiary apps'.bold.underline);
		tty.info('  Actions related to apiary application deployments.');
		tty.info('');
		tty.info('notes'.bold);
		tty.info('  these commands may be accessed without the `apps` prefix');
		tty.info('');
		tty.info('commands'.bold);
		tty.info('  apiary apps clean'.green + ' <appname>'.yellow);
		tty.info('  apiary apps list'.green);
		tty.info('  apiary apps start'.green);
		tty.info('  apiary apps stop'.green + ' <appname>'.yellow);
		tty.info('');
		tty.info('flags'.bold);
		tty.info('  -c --conf [.apiaryconf]   The file to use as our configuration');
		tty.info('  -f --file [deploy.json]   The file that is our app deployment instruction');
		tty.info('');
	});

	/**
	 * Middleware to get data used by `apps` cli commands. Will be executed before the cli router!!
	 */	
	app.use(function(cmd, tty, next) {
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
	
		// and go to next middeware or the router
		next();
	});

	/**
	 * Stops and removes (an) application(s) from the apiary system 
	 */
	app.cli(['/apps/clean', '/apps/clean/:appname'], function appsClean(cmd, tty) {
		var app = cmd.app;
		app.name = cmd.params.appname || cmd.app.name;
	
		cmd.client.clean(app, function(err, result) {
			if (err) {
				tty.error('Error cleaning app: ' + app.name);
				return eyes.inspect(err);
			}

			tty.info('Successfully cleaned app: ' + app.name.yellow);
		});
	});

	app.usage(['/apps/clean'], function appsCleanUsage(cmd, tty) {
		tty.info('');
		tty.info('apiary apps clean'.green + ' <appname>'.yellow);
		tty.info('  Removes all traces of an application from the apiary system');
		tty.info('  See `apiary apps -h` for more details');
		tty.info('');
		tty.info('params'.bold);
		tty.info('  appname [deployment script value]     name of the application');
	});

	/**
	 * Start an application on the apiary system
	 */
	app.cli(['/apps/start'], function appsStart(cmd, tty) {
		var app = cmd.app;
		cmd.client.start(app, function(err, result) {
			if (err) {
				tty.error('Error starting app: ' + app.name);
				return eyes.inspect(err);
			}
	
			tty.info('Successfully started app: ' + app.name.yellow + ' on ' +
				(result.drone.host + ':' + result.drone.port).green
			);
		});
	});

	app.usage(['/apps/start'], function appsStartUsage(cmd, tty) {
		tty.info('');
		tty.info('apiary apps start'.green);
		tty.info('  Starts and deploys if necessary an application on/to the apiary system');
		tty.info('  See `apiary apps -h` for more details');
		tty.info('');
	});

	/**
	 * Stops an application on the apiary system
	 */
	app.cli(['/apps/stop', '/apps/stop/:appname'], function appsStop(cmd, tty) {
		var app = cmd.app;
		app.name = cmd.params.appname || app.name;
	
		cmd.client.stop(app.name, function(err, result) {
			if (err) {
				tty.error('Error stopping app: ' + app.name);
				return eyes.inspect(err);
			}

			tty.info('Successfully stopped app: ' + app.name.yellow);
		});
	});

	app.usage(['/apps/stop'], function appsStopUsage(cmd, tty) {
		tty.info('');
		tty.info('apiary apps stop'.green + ' <appname>'.yellow);
		tty.info('  Stops all drones of an application on the apiary system');
		tty.info('  See `apiary apps -h` for more details');
		tty.info('');
		tty.info('params'.bold);
		tty.info('  appname [deployment script value]     name of the application');
	});

	/**
	 * Lists all apps running on the apiary system
	 */
	app.cli(['/apps/list'], function appsList (cmd, tty) {
		var pattern = cmd.params.pattern;

		cmd.client.get('', function(err, result) {
			if (err) {
				tty.error('Error listing applications');
				return eyes.inspect(err);
			}

			var appDrones = result.drones,
				rows = [['app', 'domains', 'address']],
				colors = ['yellow', 'red', 'magenta'],
				regexp;

			if (pattern) {
				regexp = new RegExp(pattern, 'i');
			}

			for (var app in appDrones) {
				var appInfo = appDrones[app].app;
				var drones = appDrones[app].drones;
				drones.forEach(function (drone) {
					if (!regexp || (regexp && regexp.test(server.role))) {
						rows.push([
							app,
							(appInfo.domains || [appInfo.domain]).map(function(item) {
								return item ? item : 'undefined'.blue;
							}).join(' & '),
							drone.host + ':' + drone.port
						]);
					}
				});
			}
			if (rows.length === 1) {
				tty.info("No applications found.");
				return;
			}

			tty.info('Applications:');
//			haibu.log.putRows('data', rows, colors);
		});
	});

	app.usage(['/apps/list'], function appsListUsage(cmd, tty) {
		tty.info('');
		tty.info('apiary apps list'.green + ' [pattern]'.yellow);
		tty.info('  Lists all the applications running on the apiary system');
		tty.info('  See `apiary apps -h` for more details');
		tty.info('');
		tty.info('params'.bold);
		tty.info('  pattern - simple regexp to filter names');
	});
}