/**
 * service.js: Generic child service module.
 *
 * Copyright 2011-2012 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @module controller
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */
 
var inherits      = require('util').inherits,
    EventEmitter2 = require('eventemitter2').EventEmitter2;

// startup intercom ipc event communications channel 
require('intercom');

/**
 * The Service class definition
 * @class Service
 * @extends EventEmitter2
 *
 * @constructor
 * Create Service instance
 * @param {Object} Options Service config options that will be applied to the created instance
 */
var Service = module.exports = function(options) {
  // if called as function return Instance
  if (!(this instanceof Service)) return new Service(options);
  var self = this;

  // apply all options attributes to this instance
  Object.keys(options).forEach(function(name){
    self[name] = options[name];
  });

  // Function to execute when the event communication channel is ready
  process.parent.ready(this.ready.bind(this));

  // Function to execute when the parent asks us to start
  process.parent.once('child::start', function(options, cbEvent) {
    self.start(options, function() {
      var args = Array.prototype.slice.call(arguments);
      // return the result to the parent
      process.parent.emit.apply(process.parent, [cbEvent].concat(args));
    });
  });

  // Function to execute when the parent asks us to stop
  process.parent.on('child::stop', function(cbEvent) {
    self.stop(function() {
      var args = Array.prototype.slice.call(arguments);
      // return the result to the parent
      process.parent.emit.apply(process.parent, [cbEvent].concat(args));
    });
  });
};
inherits(Service, EventEmitter2);


/**
 * Function that will be called when the event communication with the controller
 * is up and running.
 */
Service.prototype.ready = function() {
};


/**
 * Function that will be called when the 'child::start' event is received from the
 * parent controller.
 * @param {Object} options Service configuration options send by the parent controller
 * @param {Function} cb Callback function to call.
 */
Service.prototype.start = function(options, cb) {
  cb('No start function defined!!', options);
};


/**
 * Function that will be called when the 'child::stop' event is received from the
 * parent controller.
 * @param {Function} cb Callback function to call.
 */
Service.prototype.stop = function(cb) {
  cb('No stop function defined!!');
};