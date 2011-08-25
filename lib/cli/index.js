/**
 * index.js: General configuration of the Apiary CLI.
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
	// Read the given config file or the default one with default configuration.
	var base = path.join(process.env.HOME || '/root', '.apiary');
	app.config('.apiaryconf', {
		flags: ['c', 'conf'],
		defaults: {
			system: {
				cliSocket: path.join(base, 'apiary.sock'),
				runningBase: base
			},
			sre: {
				port: 5500,
				haibuPort: 5200
			}
		}
	});
	
	// React on `s` or `silent` argument by removing the output
	app.flag(['s', 'silent'], function(cmd, tty, next) {
		tty.remove(tty.transports.Console);
	})

	// Middleware to show where the configuration for this cli came from and
	// to connect to the config defined running Apiary System (if running)
	app.use(function(cmd, tty, next) {
		tty.info('Using config file ' + cmd.config.store.file.magenta);

		var cliSocket = cmd.config.get('system:cliSocket');
	
		// get an API to the running client
		// TODO: implement interface!!!
		utils.getClient(cliSocket, function(err, client) {
			if (err) {
				tty.info('Problem connecting to the Apiary System!');
				tty.error(err);
				return;
			}
			
			cmd.client = client;
			tty.info('Apiary System running! Connected on socket: ' + cliSocket);
				
			// and go to next middeware or the router
			next();
		});
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
		tty.info('  apiary status'.green);
		tty.info('  apiary clean'.green);
		tty.info('  apiary apps'.green);
		tty.info('  apiary config'.green);
		tty.info('');
		tty.info('flags'.bold);
		tty.info('  -s --silent                Do not log to console');
		tty.info('  -c --conf                  Configuration filename to use (default: .apiaryconf)');
		tty.info('');
	});
}