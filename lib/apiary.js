/**
 * apiary: spawn multi-system multi-user node.js clouds, on your own hardware and/or with 3rd party virtual servers
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var SREC = require('./sc/srec'),
	basePort = 8000,
	app = {
	   "user": "marak",
	   "name": "test",
	   "domain": "devjitsu.com",
	   "repository": {
		 "type": "git",
		 "url": "https://github.com/Marak/hellonode.git",
	   },
	   "scripts": {
		 "start": "server.js"
	   }
	};

console.log('Path of this env: ', process.env.PATH);

console.log('Start haibu process for user: haibu_user_1');
startSRE('haibu_user_1');

console.log('Start haibu process for user: haibu_user_2');
startSRE('haibu_user_2');

function startSRE(user) {
	var SRE = new SREC('/home/'+user, user, user);
	// actions to execute when RPC is ready
	SRE.on('RPCReady', function(childFn, conn) {
		childFn.startHaibu(function(result) {
			app.port = basePort++;
			childFn.startApp(app, function(result) {
				console.log('Child user ' +  user + ' App Start: ', result);
			});
		});
	});
	// Start the SRE
	SRE.start();
}
