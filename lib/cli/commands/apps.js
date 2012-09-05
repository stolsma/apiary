/*
 * apps.js: Commands for the `apps` resource in the apiary CLI.
 *
 * Copyright 2010 Nodejitsu Inc.
 * Copyright 2011-2012 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var fs    = require('fs'),
    app   = require('../index-new');

var apps = exports;

/**
 * Do setup operations on the given Clip App instance
 */
apps.usage = [
  '',
  'apiary apps'.bold.underline,
  '  Actions related to apiary application deployments.',
  '',
  'commands'.bold,
  '  apiary apps clean'.green + ' <appname>'.yellow,
  '  apiary apps list'.green + '  <user>'.yellow,
  '  apiary apps start'.green,
  '  apiary apps stop'.green + '  <appname>'.yellow,
  '',
  'flags'.bold,
  '  -s --silent                Do not log to console',
  '  -d --debug                 Log extended error messages',
  '  -c --conf [.apiaryconf]    The file to use as our configuration',
  '  -f --file [deploy.json]    The file that is our app deployment instruction',
  '  -u --user                  Override the user to apply the commands on'
];

  /**
   * Middleware to get data used by `apps` cli commands. Will be executed before the cli router!!
   */
  app.use(function(cmd, tty, next) {
    var app = {};
    var deploymentscript = cmd.config.get('f') || cmd.config.get('file') || 'deploy.json';
    try {
      var deployment = JSON.parse(fs.readFileSync(deploymentscript));
      tty.info('Deployment script is ' + fs.realpathSync(deploymentscript).magenta);
      ['repository', 'name', 'domain', 'domains', 'subdomain', 'subdomains', 'sng',
       'service', 'env', 'user', 'scripts', 'dependencies'].forEach(function(item) {
        if (deployment.hasOwnProperty(item)) {
          app[item] = deployment[item];
        }
      });
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
apps.clean = function(appname, end) {
  if (cmd.connected()) {
    var app = cmd.app;
    app.name = appname || cmd.app.name;
    cmd.client.remote.appClean(app.user, app, function(err /* result */) {
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
};

apps.clean.usage = [
  '',
  'apiary apps clean'.green + ' <appname>'.yellow,
  '  Removes all traces of an application from the apiary system',
  '  See `apiary apps -h` for more details',
  '',
  'params'.bold,
  '  appname [deployment script value]     name of the application'
];


/**
 * Start an application on the apiary system
 */
apps.start = function(appname, end) {
    if (cmd.connected()) {
      var app = cmd.app;
      cmd.client.remote.appStart(app.user, app, function(err, result) {
        if (err) {
          cmd.logError('Error starting app: ' + app.name, err);
          tty.end(1);
          end();
        }

        tty.info('');
        tty.info('Successfully started app: ' + app.name.yellow + ' on ' + (result.host + ':' + result.port).green);
        tty.info('');
        tty.end(0);
        end();
      });
    }
    else {
      cmd.logError('No Apiary System running!');
      tty.end(1);
      end();
    }
};

apps.start.usage = [
  '',
  'apiary apps start'.green,
  '  Starts and deploys if necessary an application on/to the apiary system',
  '  See `apiary apps -h` for more details'
];


/**
 * Stops an application on the apiary system
 */
apps.stop = function(appname, end) {
    if (cmd.connected()) {
      var app = cmd.app;
      app.name = cmd.params.appname || app.name;

      cmd.client.remote.appStop(app.user, app, function(err /* result */) {
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
};

apps.stop.usage = [
  '',
  'apiary apps stop'.green + ' <appname>'.yellow,
  '  Stops all drones of an application on the apiary system',
  '  See `apiary apps -h` for more details',
  '',
  'params'.bold,
  '  appname [deployment script value]     name of the application'
];


/**
 * Update an application on the apiary system
 */
apps.update = function(appname, end) {
    if (cmd.connected()) {
      var app = cmd.app;
      app.name = cmd.params.appname || app.name;

      cmd.client.remote.appUpdate(app.user, app, function(err /* result */) {
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
    }
    else {
      cmd.logError('No Apiary System running!');
      tty.end(1);
      end();
    }
};

apps.update.usage = [
  '',
  'apiary apps update'.green + ' <appname>'.yellow,
  '  Stops an application, Cleans all source and deps and then starts ',
  '  all started drones of an application on the apiary system',
  '  See `apiary apps -h` for more details',
  '',
  'params'.bold,
  '  appname [deployment script value]     name of the application'
];


/**
 * Lists all apps running on the apiary system
 */
apps.list = function(user, end) {
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
          };
        }
        utils.processAppList(result, tty);
        tty.end(0);
        end();
      });
    }
    else {
      cmd.logError('No Apiary System running!');
      tty.end(1);
      end();
    }
};

apps.list.usage = [
  '',
  'apiary apps list'.green + ' <user>'.yellow,
  '  Lists all the applications running on the apiary system',
  '  See `apiary apps -h` for more details',
  '',
  'params'.bold,
  '  user [username]     return all running apps from given user'
];