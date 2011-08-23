/**
 * An Apiary System Environment Controller definition. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var path = require('path'),
	inherits = require('util').inherits,
	inspect = require('util').inspect,
	EventEmitter2 = require('eventemitter2').EventEmitter2,
	
	apiary = require('../apiary');
	
/**
 * The System Environment Controller class definition
 * @class Sec
 * @extends EventEmitter2
 *
 * @constructor
 * Create System Environment Controler class
 * @param {Object} Options Sec config options:
 */
var Sec = module.exports = function(options) {
	// if called as function return Instance
	if (!(this instanceof Sec)) return new Sec(options);
	
	// set default options
	options = options || {};

	// TODO: change temporary event logging to definitive implementation
	this.onAny(function (data) {
		apiary.emit('sec::' + this.event, data);
	});
};
inherits(Sec, EventEmitter2);

// TODO: Further implementation of the SEC functions