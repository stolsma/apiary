/**
 * utils.js: General functions for the Apiary CLI.
 *
 * Copyright 2011-2012, TTC/Sander Tolsma
 * See LICENSE file for license
 */

var spawn = require('child_process').spawn,
    path  = require('path');

var apiaryUtils = require('../core/utils');

/**
 * Create a default CLI configuration object based from the given base location
 * @params {String} base Base directory for all Apiary files
 * @returns (Object) Created default configuration object
 */
exports.createDefaultConfig = function(base) {
  return {
    apiary: {
      config: {
        file: path.join(base, 'apiary.json')  // location of the general apiary configuration file
      }
    },
    cli: {
      root: base,                             // root of all the apiary related files
      forever: path.join(base, '4evr'),       // location of forever daemonizing control files
      pidFile: 'apiary.pid',                  // name of the pid locking file for the daemonized startup
      logs: {
        root: path.join(base, 'logs'),        // Generic log root directory, specific location paramaters will prefer
        forever: path.join(base, '4evr'),     // Path to log output from forever process (when daemonized)
        foreverFile: 'apiary.4evr',           // File forever will write forever process stdout and stderr to.
//        stdout: path.join(base, 'logs'),      // Path to log output from child stdout
        stdoutFile: 'apiary.stdout',          // File forever will write child process stdout to.
//        stderr: path.join(base, 'logs'),      // Path to log output from child stderr
        stderrFile: 'apiary.stderr'           // File forever will write child process stderr to.
      },
      socket: path.join(base, 'socket'),
      socketFile: 'apiary.socket'
    }
  };
};


/**
 * Start the Apiary System with given options
 * @param {String} cliConfFile Apiary CLI configuration file
 * @param {Function} cb Callbck to continue with (err)
 */
exports.start = function(cliConfFile, cb) {
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
};


/**
 * Read pidfile for pid of the CLI daemon and use that to send SIGINT and stop
 * the running Apiary system
 */
exports.stop = function(cliClient, dirs, cb) {
  cliClient.remote.getServerPid(function(pid) {
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
};


/**
 * Create an array of directories from a given config. used by createDirs and cleanDirs
 * @private
 */
function dirList(config) {
  var confAttr = ['root', 'forever', 'logs.root', 'logs.forever', 'logs.stdout', 'logs.stderr', 'socket'],
    dirs = [], props, i, check;

  confAttr.forEach(function(key) {
    props = key.split('.');
    check = config;
    for (i = 0; i < props.length; i++) {
      if (typeof(check[props[i]]) == 'undefined') break;
      check = check[props[i]];
      if (i == props.length-1) dirs.push(check);
    }
  });

  return dirs;
}


/**
 * Create all directories given in de config object with uid and gid.
 * @param {Object} config CLI config with directorie paths to initialize
 * @param {Integer} uid Uid of the directory to create
 * @param {Integer} gid Gid of the directory to create
 * @param {function} callback Continuation to respond to when complete
 */
exports.createDirs = function(config, uid, gid, cb) {
  var options = {
    mode: 0775,
    uid: uid,
    gid: gid
  };
  apiaryUtils.directories.create(dirList(config), options, cb);
};


/**
 * Clean the filesystem of all files produced by a running Apiary System
 * @param {Object} config CLI config with directorie paths to delete
 * @param {Function} cb Callback function being called when ready
 */
exports.cleanDirs = function(config, cb) {
  apiaryUtils.directories.remove(dirList(config), cb);
};


/**
 * Process returned users list
 */
exports.processUserList = function(list, tty) {
  var rows = [['user']],
      colors = ['green'];

  for (var user in list) {
    rows.push([
      user
    ]);
  }

  tty.info('');
  if (rows.length === 1) {
    tty.info("No users found.");
  } else {
    tty.info('Users:');
    tty.info('');
    tty.putRows('data', rows, colors);
  }
  tty.info('');
};


/**
 * Process returned app list
 */
exports.processAppList = function(list, tty) {
  var rows = [['user', 'app', 'domains', 'address', 'pid']],
    colors = ['green', 'yellow', 'red', 'magenta', 'magenta'],
    users = list.srecs,
    results = list.results,
    i;

  for (i=0; i < users.length; i++) {			
    var user = users[i],
      appDrones = results[i][0];

    for (var app in appDrones) {
      var appInfo = appDrones[app].app;
      var drones = appDrones[app].drones;
      drones.forEach(function(drone) {
        rows.push([
          user,
          app,
          (appInfo.domains || [appInfo.domain]).map(function(item) {
            return item ? item : 'undefined'.blue;
          }).join(' & '),
          drone.host + ':' + drone.port,
          drone.pid
        ]);
      });
    }
  }

  tty.info('');
  if (rows.length === 1) {
    tty.info("No applications found.");
  } else {
    tty.info('Applications:');
    tty.info('');
    tty.putRows('data', rows, colors);
  }
  tty.info('');
};


/**
 * Get the status of the running Apiary System
 */
exports.status = function(cb) {
  cb();
};