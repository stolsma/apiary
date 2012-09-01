/**
 * logging.js: General logging module of the Apiary System.
 *
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @module logging
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var path = require('path'),
    inherits = require('util').inherits,
    EventEmitter2 = require('eventemitter2').EventEmitter2,
    winston = require('winston');

/**
 * The Logging class definition
 * @class Logging
 * @extends EventEmitter2
 *
 * @constructor
 * Create a Logging instance
 */
var Logging = module.exports = function(options) {
	// if called as function return Instance
	if (!(this instanceof Logging)) return new Logging(options);
	var self = this;
	
	// set options to this instance
	this.location = options.location;
	this.groups = options.groups;
	this.channels = {};
	
	// Call the parent EventEmitter2 constructor
	EventEmitter2.call(this, { delimiter: '::', wildcard: true });
	
	// start configured logging channels
	Object.keys(this.groups).forEach(function(group) {
		// hack because nconf doesn't understand arrays
		group = self.groups[group];
		var event = group.event,
			filename = group.filename;
			
		// TODO check event for proper buildup!!
		if (!event || !filename) return;
		
		// add group to the log channels
		self.addChannel(event, path.join(self.location, filename));
	});
  
  // send all events to stdout
  this.onAny(function() {
    console.log(this.event, arguments);
  });
  
};
inherits(Logging, EventEmitter2);


/**
 * process the events send and put them into the log channel 
 */
Logging.prototype.logger = function() {
	var event = this.event,
		args = Array.prototype.slice.call(arguments),
		channel = args.shift(),
		logger = args.shift(),
		eParts = event.split(this.delimiter),
		cParts = channel.split('::');
		
	for (var i=0; i < cParts.length; i++) {
		// they are not the same and cParts != '**' : break
		if (eParts[i] && (cParts[i] !== '**') && (eParts[i] !== cParts[i])) break;
		// end of channel type or short event then log it
		if ((cParts[i] === '**') || !eParts[i]) {
			logger.info(event, args);
			break;
		}
	}
};


/**
 * Stop all logging channels
 */
Logging.prototype.stop = function(cb) {
  // close all channels
  var self = this;
  Object.keys(this.channels).forEach(function(event) {
    self.removeChannel(event);
  });
  
  // TODO Find out how to know when all log buffers are saved to exit cleanly
  // For now just use a timer to wait for flush
  setTimeout(function() {
    cb();
  }, 1000);

};


/**
 * Add the log channel with the given channel name and filename
 * @param {String} name Name of the log channel to add
 * @param {String} filename Logfile to log to
 */
Logging.prototype.addChannel = function(name, filename) {
  var logger = winston.loggers.add(name, {
    transports: [
      new (winston.transports['File'])({
        filename: filename,
        timestamp: true
      })
    ]
  });
	
	// create listener function
	var eventFn = this.logger.bind(this, name, logger);
	
	// add listener function to get the requested events and throw them at the logger
	//  TODO: when EventEmitter2 understands ** make the listener easier!! :-)
	this.onAny(eventFn);
	
	// administer the logger for later use
	this.channels[name] = {
		logger: logger,
		eventFn: eventFn
	};
};


/**
 * Remove the log channel with the given name
 * @param {String} name Name of the log channel to remove
 */
Logging.prototype.removeChannel = function(name) {
	var channel = this.channels[name]; 
	if (!channel) return new Error('Can not remove, this log channel does not exist!!');
	delete this.channels[name];
	
	// remove the listener
	this.offAny(channel.eventFn);
	
	// close the logger
	winston.loggers.close(name);
  
};


/**
 * Get the correct log channel with the given name
 * @param {String} name Name of the log channel to return
 */
Logging.prototype.getChannel = function(name) {
	var channel = this.channels[name]; 
	if (!channel) return new Error('Can not get requested channel, this log channel does not exist!!');
	return channel;
};