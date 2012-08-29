/**
 * system.js: Commands for the system resources in the Apiary CLI.
 *
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 */

var colors = require('colors');

// local modules
var	utils = require('./utils');

/**
 * Do setup operations on the given Clip App instance
 * @param {ClipApp} app The Clip application instance to execute operations on
 */
module.exports = function setupConfig(app) {
  /**
   * Starts a daemonized Apiary system
   */
  app.cli(['/start'], function start(cmd, tty, end) {
    if (!cmd.connected()) {
      tty.info('');
      tty.info('Starting the Apiary system!'.magenta);

      // start Apiary
      utils.start(app.cliConfFile, function(err) {
        if (err) {
          cmd.logError('Error starting the Apiary system!', err);
          tty.end(1);
          end();
        }
        tty.info('');
        tty.info('The Apiary system is started as a daemon!'.magenta);
        tty.info('');
        tty.end(0);
        end();
      });
    } else {
      cmd.logError('Already an Apiary System started!');
      tty.end(1);
      end();
    }
  });

  app.usage('/start', function startUsage(cmd, tty) {
    tty.info('');
    tty.info('apiary start'.green);
    tty.info('  Starts the Apiary System. This command must be executed with root privileges ([sudo])');
    tty.info('  See `apiary config -h` for more configuration details');
    tty.info('');
  });

  /**
   * Cleanly stops the running Apiary System
   */
  app.cli('/stop', function stop(cmd, tty, end) {
    if (cmd.connected()) {
      utils.stop(cmd.client, cmd.config.get('cli'), function(err, pid) {
        if (err) {
          if (err.code == 'ESRCH') {
            return tty.error('Apiary Forever process not there!')
          } else 
            return tty.error('Error stopping Apiary: ', err);
        }
        tty.info('');
        tty.info('Pid of the Apiary Forever process stopped was: ' + pid);
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

  app.usage('/stop', function stopUsage(cmd, tty) {
    tty.info('');
    tty.info('apiary stop'.green);
    tty.info('  Stops the Apiary System. This command must be executed with root privileges ([sudo])');
    tty.info('  See `apiary config -h` for more configuration details');
    tty.info('');
  });

	/**
	 * Gives the status of the (running) Apiary System
	 */
	app.cli('/status', function status(cmd, tty, end) {
		if (cmd.connected()) {
			utils.status(function(err, result) {
				if (err) {
					tty.error('');
					tty.error('Error getting the Apiary System status!!'.red);
					tty.error(err);
					return
				}
	
				tty.info('');
				tty.info('Pid is: ' + result);
				tty.info('');
				tty.end(0);
				end();
			});
		} else {
			tty.info('');
			tty.info('No Apiary System running!');
			tty.info('');
			tty.end(1);
			end();
		}
	});

	app.usage('/status', function statusUsage(cmd, tty) {
		tty.info('');
		tty.info('apiary status'.green);
		tty.info('  Gives the current status of the Apiary System. This command must be executed with root privileges ([sudo])');
		tty.info('');
	});

	/**
	 * Clean the logfiles, and other dynamic files
	 */
	app.cli('/clean', function clean(cmd, tty, end) {
		if (!cmd.connected()) {
			utils.cleanDirs(cmd.config.get('cli'), function(err, result){
				if (err) {
					tty.error('');
					tty.error('Error cleaning the Apiary System!!'.red);
					tty.error(err);
					return
				}

				tty.info('');
				tty.info('Cleaned the Apiary System!!');
				tty.info('');
				tty.end(0);
				end();
			});
		} else {
			cmd.logError('Can not clean when the Apiary System is running!');
			tty.end(1);
			end();
		}
	});

	app.usage('/clean', function stopClean(cmd, tty) {
		tty.info('');
		tty.info('apiary clean'.green);
		tty.info('  Cleans the dynamic stored data like logs and configs. This command must be executed with root privileges ([sudo])');
		tty.info('');
	});
}