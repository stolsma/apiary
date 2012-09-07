/**
 * apps.js: Commands for the `apps` resource in the apiary CLI.
 *
 * Copyright 2010 Nodejitsu Inc.
 * Copyright 2011-2012 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var fs    = require('fs'),
    app   = require('../../cli');

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
 * Get data used by `apps` cli commands.
 */
function getAppData() {
  var appData = {};
  var deploymentScript = app.config.get('f') || app.config.get('file') || 'deploy.json';
  
  try {
    var deployment = JSON.parse(fs.readFileSync(deploymentScript));
    app.log.info('Deployment script is ' + fs.realpathSync(deploymentScript).magenta);
    
    ['repository', 'name', 'domain', 'domains', 'subdomain', 'subdomains', 'sng',
     'service', 'env', 'user', 'scripts', 'dependencies'].forEach(function(item) {
      if (deployment.hasOwnProperty(item)) {
        appData[item] = deployment[item];
      }
    });
  }
  catch (e) {
    app.log.info('`' + deploymentScript.magenta + '` file was not found or its content is not correct JSON!');
  }

  appData.user = app.config.get('u') || app.config.get('user') || appData.user || app.config.get('cli:user') || '';
  app.log.info('Current application user: ' + appData.user.yellow);

  return appData;
}


/**
 * Stops and removes (an) application(s) from the apiary system
 * @param {Function} end Callbck to continue with (err)
 */
apps.clean = function(appname, end) {
  if (app.client.connected(end)) {
    var appData = getAppData();
    appData.name = appname || app.config.get('name');
    app.client.remote.appClean(appData.user, appData, function(err /* result */) {
      if (err) {
        app.log.warn('Error cleaning app: ' + appData.name, err);
        end(err);
      }

      app.log.info('');
      app.log.info('Successfully cleaned app: ' + appData.name.yellow);
      app.log.info('');
      end();
    });
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
 * @param {Function} end Callbck to continue with (err)
 */
apps.start = function(end) {
  if (app.client.connected(end)) {
    var appData = getAppData();
    app.client.remote.appStart(appData.user, appData, function(err, result) {
      if (err) {
        app.log.warn('Error starting app: ' + appData.name, err);
        end(err);
      }

      app.log.info('');
      app.log.info('Successfully started app: ' + appData.name.yellow + ' on ' + (result.host + ':' + result.port).green);
      app.log.info('');
      end();
    });
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
 * @param {Function} end Callbck to continue with (err)
 */
apps.stop = function(appname, end) {
  if (app.client.connected(end)) {
    var appData = getAppData();
    appData.name = appname || appData.name;

    app.client.remote.appStop(appData.user, appData, function(err /* result */) {
      if (err) {
        app.log.warn('Error stopping app: ' + appData.name, err);
        end();
      }

      app.log.info('');
      app.log.info('Successfully stopped app: ' + appData.name.yellow);
      end();
    });
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
 * @param {Function} end Callbck to continue with (err)
 */
apps.update = function(appname, end) {
  if (app.client.connected(end)) {
    var appData = getAppData();
    appData.name = appname || appData.name;

    app.client.remote.appUpdate(appData.user, appData, function(err /* result */) {
      if (err) {
        app.log.warn('Error updating app: ' + appData.name, err);
        end();
      }

      app.log.info('');
      app.log.info('Successfully updated app: ' + appData.name.yellow);
      end();
    });
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
 * Lists all apps running on the apiary system or fot given user
 * @param {Function} end Callbck to continue with (err)
 */
apps.list = function(user, end) {
  if (app.client.connected(end)) {
    user = user || 'all';

    app.client.remote.appList(user, function(err, result) {
      if (err) {
        app.log.warn('Error listing applications');
        end();
      }

      if (user !== 'all') {
        result = {
          srecs: [user],
          results: [[result]]
        };
      }
      processAppList(result);
      end();
    });
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

/**
 * Process returned app list
 */
function processAppList(list) {
  var rows    = [['user', 'app', 'domains', 'address', 'pid']],
      colors  = ['green', 'yellow', 'red', 'magenta', 'magenta'],
      users   = list.srecs,
      results = list.results,
      i;

  for (i=0; i < users.length; i++) {
    var user      = users[i],
        appDrones = results[i][0];

    for (var userApp in appDrones) {
      var appInfo = appDrones[userApp].app,
          drones  = appDrones[userApp].drones;
      
      drones.forEach(function(drone) {
        rows.push([
          user,
          userApp,
          (appInfo.domains || [appInfo.domain]).map(function(item) {
            return item ? item : 'undefined'.blue;
          }).join(' & '),
          drone.host + ':' + drone.port,
          drone.pid
        ]);
      });
    }
  }

  app.log.info('');
  if (rows.length === 1) {
    app.log.info("No applications found.");
  } else {
    app.log.info('Applications:');
    app.log.info('');
    app.log.putRows('data', rows, colors);
  }
  app.log.info('');
}