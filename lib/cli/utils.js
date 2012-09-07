/**
 * utils.js: General functions for the Apiary CLI.
 *
 * Copyright 2011-2012, TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path  = require('path');

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