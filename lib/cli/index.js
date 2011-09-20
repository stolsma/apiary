/**
 * index.js: General configuration of the Apiary CLI.
 *
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	fs = require('fs'),
	colors = require('colors'),
	eyes = require('eyes');

	// own cli modules
var	utils = require('./utils');

/**
 * Do setup operations on the given Clip App instance
 * @param {ClipApp} app The Clip application instance to execute operations on
 */
module.exports = function setupConfig(app) {
	// Read the given config file or the default one with default configuration.
	var base = path.join(process.env.HOME || '/root', '.apiary');
	app.config('.apiaryconf', {
		flags: ['c', 'conf'],
		defaults: {
			apiary: {
				config: {
					file: path.join(base, 'apiary.json')
				}
			},
			cli: {
				socket: path.join(base, 'apiary.sock'),
				base: base
			}
		}
	});
	
	// React on `s` or `silent` argument by removing the output
	app.flag(['s', 'silent'], function(cmd, tty, next) {
		tty.remove(tty.transports.Console);
	})

	// Add error handler who will react on `d` or `debug` argument by doing 
	// extended error output
	app.use(function(cmd, tty, next) {
		cmd.logError = function(msg, err) {
			tty.error('');
			tty.error(msg);
			if (err) tty.error(err.message);
			tty.error('');
			if (err && (cmd.config.get('d') || cmd.config.get('debug'))) { 
				eyes.inspect(err);
				tty.error('');
			}
		};
		// next middleware
		next();
	})

	// Middleware to show where the configuration for this cli came from and
	// to connect to the config defined running Apiary System (if running)
	app.use(function(cmd, tty, next) {
		// set banner
		utils.banner(tty);
		
		// set current version + show config file used
		var version	= JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'))).version;
		cmd.config.set('apiary:system:version', version);
		tty.info('Running Apiary CLI version ' + version.magenta);
		tty.info('Using config file ' + cmd.config.store.file.magenta);

		// define connected checking function
		cmd.connected = function() {
			return (cmd.client && cmd.client.connected);
		}
		
		// try to connect to a running Apiary System
		var cliSocket = cmd.config.get('cli:socket');
		utils.getClient(cliSocket, connected, notConnected);
		
		function connected(client, api) {
			cmd.client = client;
			tty.info('Apiary System running! Connected on socket: ' + cliSocket.magenta);
			next();
		}
		
		function notConnected(err, client, cause) {
			if (err) {
				cmd.logError('Problem connecting to the Apiary System!', err);
			} else if (cause == 'EACCES') {
				cmd.logError('Not enough privileges to connect to the requested Apiary System!');
			} else {
				tty.info('No Apiary System running!'.red);
				next();
			}
		}
		
	});
	
	/**
	 * Standard usage info when nothing executes...
	 */
	app.usage(function usage(cmd, tty, end) {
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
		tty.info('  -d --debug                 Log extended error messages');
		tty.info('  -c --conf                  Configuration filename to use (default: .apiaryconf)');
		tty.info('');
		end();
	});
}