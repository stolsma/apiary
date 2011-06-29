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
	// start System Runtime Environment
	var SRE = new SREC('/home/'+user, user);
	
	// actions to execute when SRE is ready
	SRE.on('RPCReady', function(childFn, conn) {
		childFn.startHaibu('development', function(result) {
			childFn.startApp(app, basePort++, function(err, result) {
				if (err) 
					console.log('Child user ' +  user + ' App Start error: ', err);
				else 
					console.log('Child user ' +  user + ' App Start: ', result);
			});
		});
	});
	
	// Start the SRE
	SRE.start();
}
