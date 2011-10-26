/*
 * apps.js: Commands for the `apps` resource in the apiary CLI.
 *
 * (C) 2010, Nodejitsu Inc.
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 */
 
var fs = require('fs'),
	colors = require('colors');

	// own modules
var	utils = require('./utils');

/**
 * Do setup operations on the given Clip App instance
 * @param {ClipApp} app The Clip application instance to execute operations on
 */
module.exports = function setupApps(app) {
	app.usage('/apps', function config(cmd, tty, end) {
		tty.info('');
		tty.info('apiary apps'.bold.underline);
		tty.info('  Actions related to apiary application deployments.');
		tty.info('');
		tty.info('commands'.bold);
		tty.info('  apiary apps clean'.green + ' <appname>'.yellow);
		tty.info('  apiary apps list'.green + '  <user>'.yellow);
		tty.info('  apiary apps start'.green);
		tty.info('  apiary apps stop'.green + '  <appname>'.yellow);
		tty.info('');
		tty.info('flags'.bold);
		tty.info('  -s --silent                Do not log to console');
		tty.info('  -d --debug                 Log extended error messages');
		tty.info('  -c --conf [.apiaryconf]    The file to use as our configuration');
		tty.info('  -f --file [deploy.json]    The file that is our app deployment instruction');
		tty.info('  -u --user                  Override the user to apply the commands on');
		tty.info('');
		end();
	});

	/**
	 * Middleware to get data used by `apps` cli commands. Will be executed before the cli router!!
	 */	
	app.use(function(cmd, tty, next) {
		var app = {};
		var deploymentscript = cmd.config.get('f') || cmd.config.get('file') || 'deploy.json';
		try {
			var deployment = JSON.parse(fs.readFileSync(deploymentscript));
			tty.info('Deployment script is ' + fs.realpathSync(deploymentscript).magenta);
			['repository', 'name', 'domain', 'domains', 'subdomain', 'subdomains', 'sng', 'service', 'env', 'user', 'scripts', 'dependencies'].forEach(function(item) {
				if (deployment.hasOwnProperty(item)) {
					app[item] = deployment[item];
				}
			})
		} catch (e) {
			tty.info('`' + deploymentscript.magenta + '` file was not found or its content is not correct JSON!');
		}

		app.user = cmd.config.get('u') || cmd.config.get('user') || app.user || cmd.config.get('cli:user') || '';
		tty.info('Current application user: ' + app.user.yellow);
		cmd.app = app;
	
		// and go to next middeware or the router
		next();
	});

	/**
	 * Stops and removes (an) application(s) from the apiary system 
	 */
	app.cli(['/apps/clean', '/apps/clean/:appname'], function appsClean(cmd, tty, end) {
		if (cmd.connected()) {
			var app = cmd.app;
			app.name = cmd.params.appname || cmd.app.name;
			cmd.client.remote.appClean(app.user, app, function(err, result) {
				if (err) {
					cmd.logError('Error cleaning app: ' + app.name, err);
					tty.end(1);
					end();
				}
	
				tty.info('');
				tty.info('Successfully cleaned app: ' + app.name.yellow);
				tty.info('');
				tty.end(0);
				end();
			});
		} else {
			cmd.logError('No Apiary System running!');
			tty.end(1);
			end();
		}
	});

	app.usage(['/apps/clean'], function appsCleanUsage(cmd, tty, end) {
		tty.info('');
		tty.info('apiary apps clean'.green + ' <appname>'.yellow);
		tty.info('  Removes all traces of an application from the apiary system');
		tty.info('  See `apiary apps -h` for more details');
		tty.info('');
		tty.info('params'.bold);
		tty.info('  appname [deployment script value]     name of the application');
		tty.info('');
		end();
	});

	/**
	 * Start an application on the apiary system
	 */
	app.cli(['/apps/start'], function appsStart(cmd, tty, end) {
		if (cmd.connected()) {
			var app = cmd.app;
			cmd.client.remote.appStart(app.user, app, function(err, result) {
				if (err) {
					cmd.logError('Error starting app: ' + app.name, err);
					tty.end(1);
					end();
				}
		
				tty.info('');
				tty.info('Successfully started app: ' + app.name.yellow + ' on ' +
					(result.host + ':' + result.port).green
				);
				tty.info('');
				tty.end(0);
				end();
			});
		} else {
			cmd.logError('No Apiary System running!');
			tty.end(1);
			end();
		}
	});

	app.usage(['/apps/start'], function appsStartUsage(cmd, tty, end) {
		tty.info('');
		tty.info('apiary apps start'.green);
		tty.info('  Starts and deploys if necessary an application on/to the apiary system');
		tty.info('  See `apiary apps -h` for more details');
		tty.info('');
		end();
	});

	/**
	 * Stops an application on the apiary system
	 */
	app.cli(['/apps/stop', '/apps/stop/:appname'], function appsStop(cmd, tty, end) {
		if (cmd.connected()) {
			var app = cmd.app;
			app.name = cmd.params.appname || app.name;
		
			cmd.client.remote.appStop(app.user, app, function(err, result) {
				if (err) {
					cmd.logError('Error stopping app: ' + app.name, err);
					tty.end(1);
					end();
				}
	
				tty.info('');
				tty.info('Successfully stopped app: ' + app.name.yellow);
				tty.end(0);
				end();
			});
		} else {
			cmd.logError('No Apiary System running!');
			tty.end(1);
			end();
		}
	});

	app.usage(['/apps/stop'], function appsStopUsage(cmd, tty, end) {
		tty.info('');
		tty.info('apiary apps stop'.green + ' <appname>'.yellow);
		tty.info('  Stops all drones of an application on the apiary system');
		tty.info('  See `apiary apps -h` for more details');
		tty.info('');
		tty.info('params'.bold);
		tty.info('  appname [deployment script value]     name of the application');
		tty.info('');
		end();
	});

	/**
	 * Update an application on the apiary system
	 */
	app.cli(['/apps/update', '/apps/update/:appname'], function appsUpdate(cmd, tty, end) {
		if (cmd.connected()) {
			var app = cmd.app;
			app.name = cmd.params.appname || app.name;
		
			cmd.client.remote.appUpdate(app.user, app, function(err, result) {
				if (err) {
					cmd.logError('Error updating app: ' + app.name, err);
					tty.end(1);
					end();
				}
	
				tty.info('');
				tty.info('Successfully updated app: ' + app.name.yellow);
				tty.end(0);
				end();
			});
		} else {
			cmd.logError('No Apiary System running!');
			tty.end(1);
			end();
		}
	});

	app.usage(['/apps/update'], function appsStopUsage(cmd, tty, end) {
		tty.info('');
		tty.info('apiary apps update'.green + ' <appname>'.yellow);
		tty.info('  Stops an application, Cleans all source and deps and then starts ');
		tty.info('  all started drones of an application on the apiary system');
		tty.info('  See `apiary apps -h` for more details');
		tty.info('');
		tty.info('params'.bold);
		tty.info('  appname [deployment script value]     name of the application');
		tty.info('');
		end();
	});

	/**
	 * Lists all apps running on the apiary system
	 */
	app.cli(['/apps/list', 'apps/list/:user'], function appsList (cmd, tty, end) {
		if (cmd.connected()) {
			var user = cmd.params.user || 'all';
	
			cmd.client.remote.appList(user, function(err, result) {
				if (err) {
					cmd.logError('Error listing applications');
					tty.end(1);
					end();
				}
	
				if (user !== 'all') {
					result = {
						srecs: [user],
						results: [[result]]
					}
				}
				utils.processAppList(result, tty);
				tty.end(0);
				end();
			});
		} else {
			cmd.logError('No Apiary System running!');
			tty.end(1);
			end();
		}
	});

	app.usage(['/apps/list'], function appsListUsage(cmd, tty, end) {
		tty.info('');
		tty.info('apiary apps list'.green + ' <user>'.yellow);
		tty.info('  Lists all the applications running on the apiary system');
		tty.info('  See `apiary apps -h` for more details');
		tty.info('');
		tty.info('params'.bold);
		tty.info('  user [username]     return all running apps from given user');
		tty.info('');
		end();
	});
}