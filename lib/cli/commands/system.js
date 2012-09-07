/**
 * system.js: Commands for the system resources in the Apiary CLI.
 *
 * Copyright 2011-2012 TTC/Sander Tolsma
 * See LICENSE file for license
 */

// local modules
var spawn = require('child_process').spawn,
    path  = require('path'),
    app   = require('../../cli');

var system = exports;


/**
 * Starts a daemonized Apiary system
 * @param {Function} end Callbck to continue with (err)
 */
system.start = function(end) {
  if (!app.client.connected()) {
    app.log.info('');
    app.log.info('Starting the Apiary system!'.magenta);

    // start Apiary
    start(app.config.get('cliConfFile'), function(err) {
      if (err) {
        app.log.warn('Error starting the Apiary system!');
        end(err);
      }
      app.log.info('');
      app.log.info('The Apiary system is started as a daemon!'.magenta);
      app.log.info('');
      end();
    });
  }
  else {
    end('Already an Apiary System started!');
  }
};

system.start.usage = [
  '',
  'apiary start'.green,
  '  Starts the Apiary System. This command must be executed with root privileges ([sudo])',
  '  See `apiary config -h` for more configuration details',
  ''
];

/**
 * Start the Apiary System with given options
 * @param {String} cliConfFile Apiary CLI configuration file
 * @param {Function} cb Callbck to continue with (err)
 */
function start(cliConfFile, cb) {
  var spawnOptions = {
    cwd       : process.cwd(),
    env       : process.env,
    stdio     : 'inherit',
    detached  : true
  };

  // start the main Apiary process and unref from current process
  var args = [path.join(__dirname, 'startup', 'apiary.js')].concat(['-c', cliConfFile]);
  var child = spawn(process.execPath, args, spawnOptions);
  child.unref();

  return cb ? cb(): null;
}


/**
 * Cleanly stops the running Apiary System
 * @param {Function} end Callbck to continue with (err)
 */
system.stop = function(end) {
  if (app.client.connected(end)) {
    stop(function(err, pid) {
      if (err) {
        if (err.code == 'ESRCH') {
          app.log.warn('Apiary Forever process not there!');
        }
        else if (err.code == 'EPERM') {
          app.log.warn('Not enough privileges to stop the Apiary System!');
        } 
        else { 
          app.log.warn('Error stopping Apiary: ');
        }
        end(err);
        return;
      }
      
      app.log.info('');
      app.log.info('Pid of the Apiary Forever process stopped was: ' + pid);
      app.log.info('');
      end();
    });
  }
};

system.stop.usage = [
  '',
  'apiary stop'.green,
  '  Stops the Apiary System. This command must be executed with root privileges ([sudo])',
  '  See `apiary config -h` for more configuration details',
  ''
];

/**
 * Read pidfile for pid of the CLI daemon and use that to send SIGINT and stop
 * the running Apiary system
 * @param {Function} cb Callbck to continue with (err)
 */
function stop(cb) {
  app.client.remote.getServerPid(function(pid) {
    var err;
    
    // Signal the apiary system to stop safely
    try {
      process.kill(pid, 'SIGINT');
    }
    catch (e) {
      err = e;
    }
    cb(err, pid);
  });
}


/**
 * Gives the status of the (running) Apiary System
 * @param {Function} end Callbck to continue with (err)
 */
system.status = function(end) {
  if (app.client.connected(end)) {
    status(function(err, result) {
      if (err) {
        app.log.warn('');
        app.log.warn('Error getting the Apiary System status!!'.red);
        return end(err);
      }

      app.log.info('');
      app.log.info('Pid is: ' + result);
      app.log.info('');
      end();
    });
  }
};

system.status.usage = [
  '',
  'apiary status'.green,
  '  Gives the current status of the Apiary System. This command must be executed with root privileges ([sudo])',
  ''
];

function status(cb) {
  app.client.remote.getServerPid(function(pid) {
   cb(null, pid);
  });
}


/**
 * Clean the logfiles, and other dynamic files
 * @param {Function} end Callbck to continue with (err)
 */
system.clean = function(end) {
  if (!app.client.connected()) {
    utils.cleanDirs(app.config.get('cli'), function(err /* result */){
      if (err) {
        app.log.warn('');
        app.log.warn('Error cleaning the Apiary System!!'.red);
        return end(err);
      }

      app.log.info('');
      app.log.info('Cleaned the Apiary System!!');
      app.log.info('');
      end();
    });
  }
  else {
    end('Can not clean when the Apiary System is running!');
  }
};

system.clean.usage = [
  '',
  'apiary clean'.green,
  '  Cleans the dynamic stored data like logs and configs. This command must be executed with root privileges ([sudo])',
  ''
];