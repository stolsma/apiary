/**
 * apiarywrap.js: Script wrap for starting the local Apiary core process.
 *
 * (C) 2011, TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @module apiarywrap
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */
 
// startup intercom ipc event communications channel 
require('intercom');

var path = require('path');

var apiary = require('../../apiary'),
	CliServer = require('../../sc/apis/cliserver');

// Function to execute when the parent asks us to start
process.parent.once('child::start', function(options, cbEvent) {
	var apiaryOptions = options.apiaryOptions;
	
	// TODO implement the correct location for the cli API, i.e. in the SCAPI Service
	// This is temporary!!!! : create a CliServer instance and start listening on the given socket 
	apiary.cliServer = CliServer().listen(path.join(options.socket, options.socketFile), function(err) {
	});
	
	// location of the APIE and SSE socket files and the location of the log files
	apiaryOptions.socket = apiaryOptions.socket || options.socket;
	apiaryOptions.logging = { location: options.logs };

	// and start the Apiary System with the given options
	apiary.start(apiaryOptions, function(err) {
		// return the result to the parent
		process.parent.emit(cbEvent, err);
	});
	
});
	
// Function to execute when the parent asks us to stop
process.parent.on('child::stop', function(cbEvent) {
	apiary.stop(false, function(errList) {
		// return the result to the parent
		process.parent.emit(cbEvent, errList);
	});
});
