/**
 * apiary: spawn multi-system multi-user node.js clouds, on your own hardware and/or with 3rd party virtual servers
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var srec = require('./sc/srec'),
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
startSre('haibu_user_1');

console.log('Start haibu process for user: haibu_user_2');
startSre('haibu_user_2');

function startSre(user) {
	// start System Runtime Environment
	var sre = srec('/home/'+user, user);
	
	// actions to execute when SRE is ready
	sre.on('RPCReady', function(childFn, conn) {
		console.log('Child user ' +  user + ' RPCReady');
		
		childFn.startHaibu('development', function(result) {
			console.log('Child user ' +  user + ' Haibu started');
		
			childFn.startApp(app, basePort++, function(err, result) {
				if (err) 
					console.log('Child user ' +  user + ' App Start error: ', err);
				else 
					console.log('Child user ' +  user + ' App Start: ', result);
			});
		});
	});
	
	// Start the SRE
	sre.start();
}
