/**
 * System Runtime Environment Haibu wrap and port change plugin
 * This is a plugin for haibu to implement configurable wrap file and port adresses
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path = require('path'),
	haibu = require('haibu');

var wrapPort = exports;

// Name this plugin so it can be accessed by name
wrapPort.name = 'wrapport';

/**
 * Returns the appropriate spawn options for the `haibu.Spawner` for 
 * the `repo` along with the changed port number. 
 * @repo {Repository} Code repository we are spawning from
 * @host {string} Host that the application should listen on
 * @port {string|number} Ports the application should listen on
 */
wrapPort.spawnOptions = function (repo, host, port) {
	return {
		carapace: path.join(__dirname, '..', 'drone', 'dronewrap.js'),
		drone: [repo.startScript, host, repo.app.port]
	}
};
