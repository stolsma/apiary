/**
 * users.js: Commands for the `users` resource in the apiary CLI.
 *
 * Copyright 2011-2012 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var utils = require('./utils'),
    app   = require('../../cli');

var users = exports;


/**
 * Explain the usage of the 'users' actions
 */
users.usage = [
  '',
  'apiary users'.bold.underline,
  '  Actions related to system users.',
  '',
  'commands'.bold,
  '  apiary users add'.green + ' <id>'.yellow,
  '  apiary users remove'.green + ' <id>'.yellow,
  '  apiary users list'.green,
  '  apiary users clean'.green + ' <id>'.yellow,
  '',
  'flags'.bold,
  '  -c --conf [.apiaryconf]    The file to use as our configuration',
  ''
];

/**
 * Adds a system user to the Apiary System
 * @param {Function} end Callbck to continue with (err)
 */
users.add = function(user, uid, gid, end) {
  if (app.client.connected(end)) {
    user = user || app.config.get('user');
    if (!user) {
      app.log.warn('No system user given!');
      return end();
    }
    app.client.remote.userAdd(user, uid, gid, function(err) {
      if (err) {
        app.log.warn('Error adding user: ' + user.yellow);
        return end(err);
      }

      app.log.info('');
      app.log.info('Successfully added user: ' + user.yellow);
      app.log.info('');
      end();
    });
  }
};

users.add.usage = [
  '',
  'apiary users add'.green + ' <name>'.yellow + ' <uid>'.yellow + ' <gid>'.yellow,
  '  Adds the given username (with system uid/gid) to the running Apiary',
  '  system. If parameters are not given you will be interactively requested',
  '  to enter them. See `apiary config -h` for more details.',
  '',
  'params'.bold,
  '  name - apiary user name to use',
  '  uid  - system user id',
  '  gid  - system group id',
  ''
];


/**
 * Removes a system user from the Apiary System 
 * @param {Function} end Callbck to continue with (err)
 */
users.remove = function(user, end) {
  if (app.client.connected(end)) {
    user = user || app.config.get('user');
    if (!user) {
      app.log.warn('No system user given!');
      return end();
    }
    app.client.remote.userRemove(user, function(err) {
      if (err) {
        app.log.warn('Error removing user: ' + user.yellow);
        return end(err);
      }

      app.log.info('');
      app.log.info('Successfully removed user: ' + user.yellow);
      end();
    });
  }
};
  
users.remove.usage = [
  '',
  'apiary users remove'.green + ' <id>'.yellow,
  '  Removes the given username from the running Apiary system',
  '  See `apiary config -h` for more details',
  '',
  'params'.bold,
  '  id - apiary user name to remove',
  ''
];

/**
 * Lists all system users defined on the Apiary System 
 * @param {Function} end Callbck to continue with (err)
 */
users.list = function usersList(end) {
  if (app.client.connected(end)) {
    app.client.remote.userList(function(err, result) {
      if (err) {
        app.log.warn('Error listing users');
        return end(err);
      }

      processUserList(result);
      end();
    });
  }
};

users.list.usage = [
  '',
  'apiary users list'.green,
  '  Lists all users on the running Apiary system',
  '  See `apiary config -h` for more details',
  ''
];

/**
 * Process returned users list
 */
function processUserList(list) {
  var rows = [['user']],
      colors = ['green'];

  for (var user in list) {
    rows.push([
      user
    ]);
  }

  console.log.info('');
  if (rows.length === 1) {
    console.log.info("No users found.");
  } else {
    console.log.info('Users:');
    console.log.info('');
    console.putRows('data', rows, colors);
  }
  console.log.info('');
}


/**
 * Stops apps and resource environment, removes a user from the apiary system and
 * removes apiary files/directories from user environment 
 * @param {Function} end Callbck to continue with (err)
 */
users.clean = function(user, end) {
  if (app.client.connected(end)) {
    user = user || app.config.get('user');
    if (!user) {
      app.log.warn('No system user given!');
      return end();
    }
    app.client.remote.userClean(user, function(err /* result */) {
      if (err) {
        app.log.warn('Error cleaning user: ' + user);
        return end(err);
      }

      app.log.info('');
      app.log.info('Successfully cleaned user: ' + user.yellow);
      app.log.info('');
      end();
    });
  }
};

users.clean.usage = [
  '',
  'apiary users clean'.green + ' <id>'.yellow,
  '  Removes all traces of a user from the Apiary system',
  '  and removes all traces of apiary from the user environment',
  '  See `apiary apps -h` for more details',
  '',
  'params'.bold,
  '  id - apiary user name to clean',
  ''
];