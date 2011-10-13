/**
 * A System Controller API Service, as used by the API Environment. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var inspect = require('util').inspect,
	Parent = require('intercom').Parent;
	
var CliServer = require('./cliserver');

// startup SC API Service process with comms event channel to the API Environment parent
var parent = Parent(function(){

	// only start CliServer when event comms channel is ready and with startup data from the apie parent!!
	parent.once('apie::start', function(data) {
		CliServer(parent, data);
	});
});