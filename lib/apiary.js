/**
 * apiary: spawn multi-system multi-user node.js clouds, on your own hardware and/or with 3rd party virtual servers
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */


var EventEmitter = require('eventemitter2').EventEmitter2;

var apiary = module.exports = new EventEmitter({
		delimiter: '::',
		wildcard: true
	});

apiary.sre = require('./sre');
apiary.sreList = {};

/**
 *
 */
apiary.init = function init(options){
	// set default options
	options = options || {};
	this.defSrePort = options.srePort || 5500;
	this.defHaibuPort = options.haibuPort || 5200;

	/**
	 * Do some signal handling for SIGINT/ctrl-c (only react to it once!!!)
	 */
	process.once('SIGINT', apiary.stop.bind(this, true));
};

/**
 *
 */
apiary.stop = function stop(forced) {
	Object.keys(apiary.sreList).forEach(function(name){
		this.stopSre(name, function(err, result) {
			if (err) console.log('Error stopping SRE: ' + name + ' with err:', err);
			// remove SRE from list
			delete apiary.sreList[name];
			// last SRE is stopped??
			if (Object.keys(apiary.sreList).length == 0) {
				// to get all events processed: on nextTick exit this process
				process.nextTick(function () {
					process.exit(0);
				});
			}
		})
	}, this);
}

/**
 * Start a Service Runtime Environment for given user
 * @param {Object} options SRE startup options: user, port (optional) = apiary.defSrePort, haibuPort (optional) = apiary.defHaibuPort
 * @param {Function} cb Callback function if ready. `err` and `result` are given as arguments to this function 
 */
apiary.startSre = function startSre(options, cb) {
	var sre,
		user = options.user || null,
		name = options.name || user,
		port = options.port || apiary.defSrePort++,
		haibuPort = options.haibuPort || apiary.defHaibuPort++;
	
	// check if cb exists...
	cb = cb ? cb : function cb() {};
	
	// TODO Check if user exists as user in system!!!
	// for now only check if user is defined and just asume it is also defined in system!! ;-)
	if (!user) return cb(new Error('User does not exists!'));
	
	// start System Runtime Environment or call cb when SRE already defined with this name
	if (this.sreList[name]) return cb(null, this.sreList[name]);
	sre = apiary.sre({
		name: name,
		'hook-port': port
	});
	this.sreList[name] = {
		user: user,
		port: port,
		haibuPort: haibuPort,
		sre: sre
	};
	
	// Start the SRE and call the callback when ready
	sre.startSre({
			cwd: '/home/'+user,
			uid: user,
			gid: user,
			haibuPort: haibuPort
		},
		cb
	);
	
	return sre;
}

/**
 * Stop a Service Runtime Environment
 * @param {String} name SRE name
 * @param {Function} cb Callback function if ready. `err` and `result` are given as arguments to this function 
 */
apiary.stopSre = function stopSre(name, cb) {
	cb = cb || function(){}; 
	if (!name || !apiary.sreList[name]) cb (new Error('Wrong SRE name or SRE does not exists!!'));
	// and stop the SRE
	apiary.sreList[name].sre.stopSre(cb);
}

/**
 * Start an Application
 * @param {Object} app Application definition object: user, etc
 * @param {Function} cb Callback function if ready. `err` and `result` are given as arguments to this function 
 */
apiary.startApp = function startApp(app, cb) {
	// TODO: users <> sre.name... Find something to couple SRE to user and vice versa
	if (!app.user || !this.sreList[app.user]) {
		return cb(new Error('Service Runtime Environmet (SRE) for user:' + app.user + ' does not exists!!'))
	}
	// and start the app in the given user SRE
	this.sreList[app.user].sre.startApp(app, cb);	
}