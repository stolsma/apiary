/**
 * system.js: Commands for the system resources in the Apiary CLI.
 *
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	fs = require('fs'),
	colors = require('colors');

	// own modules
var	utils = require('./utils');
	
module.exports = function setupConfig(app) {
	/**
	 * Starts an Apiary system in this process
	 */
	app.cli('/start/direct', function start(cmd, tty) {
		tty.info('Starting the Apiary system!'.magenta);
		
		// start Apiary in this process
		utils.start(cmd.config.get('apiary'), function(err, result) {
			if (err) tty.error(err);
		});
	});
  
	/**
	 * Starts a daemonized Apiary system
	 */
	app.cli(['/start', '/start/daemon'], function start(cmd, tty) {
		tty.info('Starting the Apiary system!'.magenta);
		
		// deamonize this start script and start child process (with Forever) with Apiary in it
		utils.startDaemonized(cmd.config.get('cli:base'), false);
		
		tty.info('The Apiary system is started!'.magenta);
	});
  
	app.usage('/start', function startUsage(cmd, tty) {
		tty.info('');
		tty.info('apiary start'.green);
		tty.info('  Starts the Apiary System. This command must be executed as root ([sudo])');
		tty.info('  See `apiary config -h` for more configuration details');
		tty.info('');
		tty.info('commands'.bold);
		tty.info('  apiary start [deamon]'.green);
		tty.info('  apiary start [direct]'.green);
	});

	/**
	 * Cleanly stops the running Apiary System
	 */
	app.cli('/stop', function stop(cmd, tty) {
		utils.stop(cmd.config.get('cli:base'), function(err, pid) {
			if (err) {
				if (err.code == 'ESRCH') {
					return tty.error('Apiary Forever process not there!')
				} else 
					return tty.error('Error stopping Apiary: ', err);
			}
			tty.info('Pid of the Apiary Forever process stopped was: ' + pid);
		});
	});
  
	app.usage('/stop', function stopUsage(cmd, tty) {
		tty.info('');
		tty.info('apiary stop'.green);
		tty.info('  Stops the Apiary System. This command must be executed as root ([sudo])');
		tty.info('  See `apiary config -h` for more configuration details');
	});

	/**
	 * Gives the status of the (running) Apiary System
	 */
	app.cli('/status', function status(cmd, tty) {
		utils.status(function(err, result) {
			if (err) {
				tty.info('Error getting the Apiary System status!!'.red);
				tty.error(err);
				return
			}
			
			tty.info('Pid is: ' + status);
		});
	});
  
	app.usage('/status', function statusUsage(cmd, tty) {
		tty.info('');
		tty.info('apiary status'.green);
		tty.info('  Gives the current status of the Apiary System. This command must be executed as root ([sudo])');
	});

	/**
	 * Clean the logfiles, and other dynamic files
	 */
	app.cli('/clean', function clean(cmd, tty) {
		utils.clean(cmd.config.get('cli:base'), function(err, result){
			if (err) {
				tty.info('Error cleaning the Apiary System!!'.red);
				tty.error(err);
				return
			}
			
			tty.info('Cleaned the Apiary System!!');
		});
	});
  
	app.usage('/clean', function stopClean(cmd, tty) {
		tty.info('');
		tty.info('apiary clean'.green);
		tty.info('  Cleans the dynamic stored data like logs and configs. This command must be executed as root ([sudo])');
	});
}