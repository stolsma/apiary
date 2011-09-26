/**
 * users.js: Commands for the `users` resource in the apiary CLI.
 *
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 */
 
var colors = require('colors');

	// own modules
var	utils = require('./utils');

/**
 * Do setup operations on the given Clip App instance
 * @param {ClipApp} app The Clip application instance to execute operations on
 */
module.exports = function setupConfig(app) {
	app.usage('/users', function config(cmd, tty, end) {
		tty.info('');
		tty.info('apiary users'.bold.underline);
		tty.info('  Actions related to system users.');
		tty.info('');
		tty.info('commands'.bold);
		tty.info('  apiary users add'.green + ' <id>'.yellow);
		tty.info('  apiary users remove'.green + ' <id>'.yellow);
		tty.info('  apiary users list'.green);
		tty.info('  apiary users clean'.green + ' <id>'.yellow);
		tty.info('');
		tty.info('flags'.bold);
		tty.info('  -c --conf [.apiaryconf]    The file to use as our configuration');
		tty.info('');
		end();
	});

	/**
	 * Adds a system user to the Apiary System
	 */
	app.cli('/users/add/:id', function usersAdd(cmd, tty, end) {
		if (cmd.connected()) {
			var user = cmd.params.id;
			cmd.client.remote.userAdd(user, function(err) {
				if (err) {
					cmd.logError('Error adding user: ' + user.yellow, err);
					tty.end(1);
					end();
				}
		
				tty.info('');
				tty.info('Successfully added user: ' + user.yellow);
				tty.info('');
				tty.end(0);
				end();
			});
		} else {
			cmd.logError('No Apiary System running!');
			tty.end(1);
			end();
		}
	});
  
	app.usage('/users/add', function usersAddUsage(cmd, tty, end) {
		tty.info('');
		tty.info('apiary users add'.green + ' <id>'.yellow);
		tty.info('  Adds the given username to the running Apiary system');
		tty.info('  See `apiary config -h` for more details');
		tty.info('');
		tty.info('params'.bold);
		tty.info('  id - system user name to add');
		tty.info('');
		end();
	});

	/**
	 * Removes a system user from the Apiary System 
	 */
	app.cli('/users/remove/:id', function usersRemove(cmd, tty, end) {
		if (cmd.connected()) {
			var user = cmd.params.id;
			cmd.client.remote.userRemove(user, function(err) {
				if (err) {
					cmd.logError('Error removing user: ' + user.yellow, err);
					tty.end(1);
					end();
				}
	
				tty.info('');
				tty.info('Successfully removed user: ' + user.yellow);
				tty.end(0);
				end();
			});
		} else {
			cmd.logError('No Apiary System running!');
			tty.end(1);
			end();
		}
	});
  
	app.usage('/users/remove', function usersRemoveUsage(cmd, tty, end) {
		tty.info('');
		tty.info('apiary users remove'.green + ' <id>'.yellow);
		tty.info('  Removes the given username from the running Apiary system');
		tty.info('  See `apiary config -h` for more details');
		tty.info('');
		tty.info('params'.bold);
		tty.info('  id - system user name to remove');
		tty.info('');
		end();
	});

	/**
	 * Lists all system users defined on the Apiary System 
	 */
	app.cli('/users/list', function usersList(cmd, tty, end) {
		if (cmd.connected()) {
			cmd.client.remote.userList(function(err, result) {
				if (err) {
					cmd.logError('Error listing users');
					tty.end(1);
					end();
				}
	
				utils.processUserList(result, tty);
				tty.end(0);
				end();
			});
		} else {
			cmd.logError('No Apiary System running!');
			tty.end(1);
			end();
		}
	});
  
	app.usage('/users/list', function usersListUsage(cmd, tty, end) {
		tty.info('');
		tty.info('apiary users list'.green);
		tty.info('  Lists all users on the running Apiary system');
		tty.info('  See `apiary config -h` for more details');
		tty.info('');
		end();
	});

	/**
	 * Stops apps and resource environment, removes a user from the apiary system and
	 * removes apiary files/directories from user environment 
	 */
	app.cli(['/users/clean/:id'], function usersClean(cmd, tty, end) {
		if (cmd.connected()) {
			cmd.client.remote.userClean(cmd.params.id, function(err, result) {
				if (err) {
					cmd.logError('Error cleaning user: ' + cmd.params.id, err);
					tty.end(1);
					end();
				}
	
				tty.info('');
				tty.info('Successfully cleaned user: ' + cmd.params.id.yellow);
				tty.info('');
				tty.end(0);
				end();
			});
		} else {
			cmd.logError('No Apiary System running!');
			tty.end(1);
			end();
		}
	});

	app.usage(['/users/clean'], function usersCleanUsage(cmd, tty, end) {
		tty.info('');
		tty.info('apiary users clean'.green + ' <id>'.yellow);
		tty.info('  Removes all traces of a user from the apiary system');
		tty.info('  and removes all traces of apiary from the user environment');
		tty.info('  See `apiary apps -h` for more details');
		tty.info('');
		tty.info('params'.bold);
		tty.info('  id - system user name to clean');
		tty.info('');
		end();
	});
}