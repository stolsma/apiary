/**
 * config.js: General configuration store of the Apiary System.
 *
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 */

var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    nconf = require('nconf');

var root   = path.join(__dirname, '..', '..'),
	config = module.exports = nconf;

/**
 * Sets up configuration options with default options for maximum
 * flexibility in usage.
 * @param {Object} options Options to setup for flexibility
 */
function setupOptions(options) {
	options						= options					|| {};
	
	//
	// Config options
	//
	options.config				= options.config			|| {};
	// main config file to use for loading and saving the configuration to.
	options.config.file			= options.config.file		|| path.join(root, 'apiary.json');
	
	//
	// System options
	//
	options.system				= options.system			|| {};
	// define the SRE (Haibu) to Drone communication base port to start with
	options.system.haibuPort	= options.system.haibuPort	|| 5200;
	
	//
	// SRE options
	//
	options.sre					= options.sre				|| {};
	
	return options;
}

/**
 * Deep merge a given object with the configuration
 * @param {Object} obj Object to write to the store
 * @param {String} root Key of the obj to write to
 */
function setObject(obj, root) {
	// check arguments
	if (!obj || (typeof(obj) != 'object')) return;
	root = root ? root : '';
	
	Object.keys(obj).forEach(function (key) {
		if (typeof(obj[key]) == 'object') {
			var current = config.get(root + key);
			if (typeof(current) == 'undefined' || typeof(current) != 'object') config.set(root + key, {});
			setObject(obj[key], root + key + ':');
		} else 
			config.set(root + key, obj[key]);
	});
}

/**
 * Initialize the configuration store by reading the config file from disk
 * and merging it with given options.
 * @param {Object} options Overriding configuration options.
 * @param {function} cb Continuation to respond to when complete.
 */
config.init = function(options, cb) {
	if (!cb) {
		cb = options;
		options  = {};
	}

	// Setup `options` with default options.
	options = setupOptions(options);

	// Setup nconf to use the 'file' store
	config.use('file', {
		file: options.config.file
	});
	
	// load the configuration and if non existent create an empy one.
	config.load();
	
	// deep merge options to config, attributes in options are more important!!!
	setObject(options);
	
	// and save this new config
	config.save();
	
	// continue!!
	cb();
};