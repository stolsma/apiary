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
	Service = require('../../core/service');

// startup Child process with comms event channel
var service = Service(function(){
	this.on('parent::*::*', function() {
		console.log('child received ' + this.event, inspect(arguments));
	});

	var http = require('http');
	http.createServer(function (req, res) {
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.end('Hello World\n');
	}).listen(1337, "127.0.0.1");

	this.emit('service::started', 'Server running at http://127.0.0.1:1337/', 'argument2', 'En dit is argument3' );

	console.log('Server running at http://127.0.0.1:1337/');

});