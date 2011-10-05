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
	httpProxy = require('http-proxy'),
	Parent = require('intercom').Parent;

// startup Child process with comms event channel
var service = Parent(function(){
	this.on('parent::*::*', function() {
		console.log('child received ' + this.event, inspect(arguments));
	});

	// Create the proxy server
	httpProxy.createServer(8000, '127.0.0.1').listen(80, '::');

	this.emit('service::started', 'Http-Proxy Server running at http://[::]:80/');
});