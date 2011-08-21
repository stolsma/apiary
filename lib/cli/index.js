/**
 * index.js: Commands for the main resource in the apiary CLI.
 *
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 */

var app1 = {
		"user": "haibu_user_1",
		"name": "test",
		"domain": "devjitsu.com",
		"repository": {
			"type": "git",
			"url": "https://github.com/Marak/hellonode.git",
		},
		"scripts": {
			"start": "server.js"
		}
	};
var app2 = {
		"user": "haibu_user_2",
		"name": "test",
		"domain": "devjitsu.com",
		"repository": {
			"type": "git",
			"url": "https://github.com/Marak/hellonode.git",
		},
		"scripts": {
			"start": "server.js"
		}
	};

var colors = require('colors'),

	// own modules
	apiary = require('../apiary');

module.exports = function setupConfig(app) {
	/**
	 * Starts an Apiary system
	 */
	app.cli('/start', function start(cmd, tty) {
		/**
		 * Start apiary and configured apps...
		 */
		apiary.init();
		
		// TODO: test startups of an SRE. Wil be replaced later with correct code!!!
		apiary.sc.startSre({user: 'haibu_user_1'}, function(err, result){
			if (err) {
				console.error(err);
				return;
			}
			
			apiary.sc.startApp(app1, function(err, result) {
				if (err) {
					console.error(err);
					return;
				}
			})
		});
		
		apiary.sc.startSre({user: 'haibu_user_2'}, function(err, result){
			if (err) {
				console.error(err);
				return;
			}
			
			apiary.sc.startApp(app2, function(err, result) {
				if (err) {
					console.error(err);
					return;
				}
			})
		});	
	});
  
	app.usage('/start', function startUsage(cmd, tty) {
		tty.info('');
		tty.info('apiary start'.green);
		tty.info('  Starts the Apiary System. This command must be executed as root ([sudo])');
		tty.info('  See `apiary config -h` for more configuration details');
	});

	/**
	 * Stops the running Apiary system
	 */
	app.cli('/stop', function stop(cmd, tty) {
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