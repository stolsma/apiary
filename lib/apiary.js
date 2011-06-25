/**
 * apiary: spawn multi-system multi-user node.js clouds, on your own hardware and/or with 3rd party virtual servers
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var userController = require('./src/controller'),
	basePort = 8000,
	App = {
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

function parentRPC(childFn, RPCsession) {
	// function to show how bidirectional comms can be created
	this.request = function(msg, cb) {
		cb('ok');
	}
};
function childRPC1(childFn, RPCsession) {
	childFn.startHaibu(function(result) {
		App.port = basePort++;
		childFn.startApp(App, function(result) {
			console.log('Child1 App Start: ', result);
		});
	});
};
function childRPC2(childFn, RPCsession) {
	childFn.startHaibu(function(result) {
		App.port = basePort++;
		childFn.startApp(App, function(result) {
			console.log('Child2 App Start: ', result);
		});
	});
};

console.log('Path of this env: ', process.env.PATH);

console.log('Start haibu process for user: haibu_user_1');
userController('/home/haibu_user_1', 'haibu_user_1', 'haibu_user_1', parentRPC, childRPC1);

console.log('Start haibu process for user: haibu_user_2');
userController('/home/haibu_user_2', 'haibu_user_2', 'haibu_user_2', parentRPC, childRPC2);
