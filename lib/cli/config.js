/**
 * config.js: Commands for the `config` resource in the apiary CLI.
 *
 * (C) 2010, Nodejitsu Inc.
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 */
 
var colors = require('colors');

/**
 * Do setup operations on the given Clip App instance
 * @param {ClipApp} app The Clip application instance to execute operations on
 */
module.exports = function setupConfig(app) {
	app.usage('/config', function config(cmd, tty, end) {
		tty.info('');
		tty.info('apiary config'.bold.underline);
		tty.info('  Actions related to the apiary configuration file.');
		tty.info('');
		tty.info('notes'.bold);
		tty.info('  The configuration will be found recursively up the file system.');
		tty.info('  If no configuration file is found the HOME folder will be used.');
		tty.info('  A default configuration file will be created if none exist.');
		tty.info('');
		tty.info('commands'.bold);
		tty.info('  apiary config get'.green + ' <id>'.yellow);
		tty.info('  apiary config set'.green + ' <id> <value>'.yellow);
		tty.info('');
		tty.info('flags'.bold);
		tty.info('  -c --conf [.apiaryconf]    The file to use as our configuration');
		tty.info('');
		end();
	});

	/**
	 * Shows a system configuration parameter
	 */
	app.cli('/config/get/:id', function configGet(cmd, tty, end) {
		tty.info(cmd.params.id + ' = ' + ('' + cmd.config.get(cmd.params.id)).yellow);
		tty.end(0);
		end();
	});
  
	app.usage('/config/get', function configGetUsage(cmd, tty, end) {
		tty.info('');
		tty.info('apiary config get'.green + ' <id>'.yellow);
		tty.info('  Gets the value of a property in the apiary configuration');
		tty.info('  See `apiary config -h` for more details');
		tty.info('');
		tty.info('params'.bold);
		tty.info('  id - nconf compatible name of the property');
		end();
	});

	/**
	 * Sets a system configuration parameter
	 */
	app.cli('/config/set/:id/:value', function configSet(cmd, tty, end) {
		cmd.config.set(cmd.params.id, cmd.params.value);
		cmd.config.save();
		tty.end(0);
		end();
	});
  
	app.usage('/config/set', function configSetUsage(cmd, tty, end) {
		tty.info('');
		tty.info('apiary config set'.green + ' <id> <value>'.yellow);
		tty.info('  Sets the value of a property in the apiary configuration');
		tty.info('  See `apiary config -h` for more details');
		tty.info('');
		tty.info('params'.bold);
		tty.info('  id - nconf compatible name of the property');
		tty.info('  value - json compatible value of the property');
		end();
	});
}