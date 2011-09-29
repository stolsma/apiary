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

// base location of central Apiary config, log and socket files
var base = path.join('/var', 'local', 'apiary'),
	apiaryConf = '.apiaryconf';
	
/**
 * Do setup operations on the given Clip App instance
 * @param {ClipApp} app The Clip application instance to execute operations on
 */
module.exports = function setupConfig(app) {
	// React on `s` or `silent` argument by removing the output
	app.flag(['s', 'silent'], function(cmd, tty, next) {
		tty.remove(tty.transports.Console);
	})

	// Add error handler who will react on `d` or `debug` argument by doing 
	// extended error output. If not already exists create central location for 
	// Apiary config, log and socket files
	app.use(function(cmd, tty, next) {
		cmd.logError = function(msg, err) {
			tty.error('');
			tty.error(msg);
			if (err) tty.error(err.message);
			tty.error('');
			if (err && (cmd.flags['d'] || cmd.flags['debug'])) { 
				eyes.inspect(err);
				tty.error('');
			}
		};
		
		// create .apiaryconf or -c/--conf if it doesnt exists
		// and change owner to ENV properties SUDO_UID / SUDO_GID
		var uid = parseInt(process.env.SUDO_UID) || 0,
			gid = parseInt(process.env.SUDO_GID) || 0,
			cliConfFile = cmd.flags['c'] || cmd.flags['conf'] || path.join(process.env.HOME, apiaryConf);
			
		try {
			if (!path.existsSync(cliConfFile)) {
				fs.writeFileSync(cliConfFile, JSON.stringify(utils.createDefaultConfig(cmd.flags['l'] || cmd.flags['location'] || base), null, 2));
				fs.chmodSync(cliConfFile, 0660);
				fs.chownSync(cliConfFile, uid, gid);
			}
		} catch (e) {
			cmd.logError('Error creating ' + cliConfFile, e);
		}
		
		next();
	});
		
	// Read the given config file.
	app.config(apiaryConf, {
		flags: ['c', 'conf']
	});
	
	// Middleware to show where the configuration for this cli came from and
	// to connect to the config defined running Apiary System (if running)
	app.use(function(cmd, tty, next) {
		// Read all dirs from config file and look if they exists and if not create with standard file mode, UID and GID!!!!
		utils.createDirs(cmd.config.get('cli'), 0, 0, function() {
			// set banner
			utils.banner(tty);
			
			// set current version + show config file used
			var version	= JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'))).version;
			cmd.config.set('apiary:system:version', version);
			tty.info('Running Apiary CLI version ' + version.magenta);
			tty.info('Using CLI config file ' + cmd.config.store.file.magenta);
	
			// define connected checking function
			cmd.connected = function() {
				return (cmd.client && cmd.client.connected);
			}
			
			// try to connect to a running Apiary System
			var cliSocket = path.join(cmd.config.get('cli:socket'), cmd.config.get('cli:socketFile'));
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
		tty.info('  -l --location              Base location of central Apiary config, log and socket');
		tty.info('                             files (default: /var/local/apiary). Only used when');
		tty.info('                             configuration file (see -c --conf) does not exists yet!');
		tty.info('');
		end();
	});
}