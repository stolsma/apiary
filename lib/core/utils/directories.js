/**
 * directories.js: General directory functions
 *
 * (C) 2012, TTC/Sander Tolsma
 * See LICENSE file for license
 */

var fs = require('fs'),
    async = require('async'),
    mkdirp = require('mkdirp'),
    rimraf = require('rimraf');

/**
 * Creates all of the specified `directories`.
 * @param {Array} directories List of directorie paths to initialize
 * @param {Object} options Directory options to set like mode, uid and gid 
 * @param {function} callback Continuation to respond to when complete
 */
exports.create = function(directories, options, callback) {
  function createDir(dir, next) {
    mkdirp(dir, options.mode || 0755, function (err) {
      if(!err && options.uid) fs.chownSync(dir, options.uid, options.gid || options.uid);
      next();
    });
  }

  async.forEachSeries(directories, createDir, function() {
    callback(null, directories);
  });
};

/**
 * Remove all of the specified `directories` including child directories and files!!!.
 * @param {Array} directories Directories to remove
 * @param {function} callback Continuation to respond to when complete
 */
exports.remove = function (directories, callback) {
  function removeDir(dir, next) {
    rimraf(dir, function() {
      next();
    });
  }

  async.forEachSeries(directories, removeDir, function() {
    callback(null, directories);
  });
};