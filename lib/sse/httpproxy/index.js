/**
 * A httpproxy System Service, as used by the System Service Controller. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var httpProxy = require('http-proxy');

/**
 * Create the httproxy System Service with communication channel
 */
require('../../core/service')({
	// Function to execute when the event communication channel is ready
	ready: function() {
		process.parent.on('parent::*::*', function() {
			console.log('child received ' + this.event, inspect(arguments));
		});
	},

	// Function to execute when the parent asks us to start
	start: function(options, cb) {
		// Create the proxy server
		httpProxy.createServer(options.destPort, options.destAddress).listen(options.port, options.address);

		// indicate to the parent that we are running!!
		cb('Http-Proxy Server running at http://[' + options.address + ']:' + options.port + '/');
	},
	
	// Actions to execute when the parent asks us to stop
	stop: function(cb) {
		// tell the parent I'm in a save state
		cb('Data??');
	}
});