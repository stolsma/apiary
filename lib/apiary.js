/**
 * apiary: spawn multi-system multi-user node.js clouds, on your own hardware and/or with 3rd party virtual servers
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var app1 = {
		"user": "haibu_user_1",
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
var app2 = {
		"user": "haibu_user_2",
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

var inspect = require('util').inspect,
	EventEmitter2 = require('eventemitter2').EventEmitter2;

var apiary = module.exports = new EventEmitter2({
		delimiter: '::',
		wildcard: true
	});

apiary.Sc = require('./sc');
apiary.Sre = require('./sre');
apiary.utils = require('./utils');

/**
 *
 */
apiary.init = function init(options){
	this.sc = this.Sc();
	
	// TODO: change temporary event logging to definitive implementation
	this.onAny(function (data) {
		console.log('apiary::' + this.event.toString() + '    ' + inspect(data))
	});
	
	/**
	 * Do some signal handling for SIGINT/ctrl-c (only react to it once!!!)
	 */
	process.once('SIGINT', apiary.stop.bind(this, true));
};

apiary.start = function start(){
	/**
	 * Start apiary and configured apps...
	 */
	apiary.init();
	
	// TODO: test startups of an SRE. Wil be replaced later with correct code!!!
	apiary.sc.startSre({user: 'haibu_user_1'}, function(err, result){
		if (err) {
			console.error(err);
			return;
		}
		
		apiary.sc.startApp(app1, function(err, result) {
			if (err) {
				console.error(err);
				return;
			}
		})
	});
	
	apiary.sc.startSre({user: 'haibu_user_2'}, function(err, result){
		if (err) {
			console.error(err);
			return;
		}
		
		apiary.sc.startApp(app2, function(err, result) {
			if (err) {
				console.error(err);
				return;
			}
		})
	});	
};

/**
 *
 */
apiary.stop = function stop(forced) {
	// call the SC to stop itself and its SRE children gracefully
	this.sc.stop(true);
}

