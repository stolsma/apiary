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

console.log('Start haibu process for user: haibu_user_1');
startSre('haibu_user_1', 5500);

//console.log('Start haibu process for user: haibu_user_2');
//startSre('haibu_user_2', 5501);

function startSre(user, port) {
	// start System Runtime Environment
	var sre = srec({
		 name: user,
		'hook-port': port
	});
	
	// actions to execute when SRE is ready
	sre.on('*::carapace::running', function() {
		console.log('Carapace for user ' + user + ' running');
		
		sre.emit('srec::start', {
			ready: function(err, result) {
				sre.emit('srec::startapp', {
					app: app,
					port: basePort++,
					ready: function(err, result) {
						if (err) 
							console.log('Child user ' +  user + ' App Start error: ', err);
						else 
							console.log('Child user ' +  user + ' App Start: ', result);
					}
				});
			}
		});
	});
	
	// Start the SRE
	sre.startSre('/home/'+user, user, user);
	
	return sre;
}
