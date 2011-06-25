/**
 * Create RPC communication over internal nodejs fork communication channel
 * Using the dnode-protocol package: https://github.com/substack/dnode-protocol, Copyright 2010 James Halliday (mail@substack.net)
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var protocol = require('dnode-protocol');

module.exports = function(endpoint, local, remoteCb) {
	var proto = protocol(local),
		client = proto.create();
	
	client.on('error', function (err) {
		console.error(err && err.stack || err);
	})
	
	client.on('request', function (req) {
		endpoint.send(req); 
	});

	// ah, the child send RPC functions to use
	client.on('remote', function () {
		remoteCb.call(client.instance, client.remote, client);
	});

	// if process exits then delete corresponding rpc connection
	endpoint.on('exit', function (code) {
		proto.destroy(client.id);
	});
	
	// message coming from the other side
	endpoint.on('message', function(msg) {
		// its a shame to stringify again but else dnode-protocol cant handle...
		client.parse(JSON.stringify(msg));
	});
	
	// and startup RPC communications
	client.start();
	
	// return session!!
	return client;
};
