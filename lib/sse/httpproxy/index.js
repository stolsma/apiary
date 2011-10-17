/**
 * A httpproxy System Service, as used by the System Service Controller. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var inspect = require('util').inspect,
	httpProxy = require('http-proxy');

// startup intercom ipc event communications channel 
require('intercom');

// startup Child process with comms event channel
process.parent.ready(function(){
	process.parent.on('parent::*::*', function() {
		console.log('child received ' + this.event, inspect(arguments));
	});

	// Create the proxy server
	httpProxy.createServer(8000, '127.0.0.1').listen(80, '::');

	process.parent.emit('service::started', 'Http-Proxy Server running at http://[::]:80/');
});