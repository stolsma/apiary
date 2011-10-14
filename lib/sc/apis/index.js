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

	// only start Servers when event comms channel is ready and with startup data from the apie parent!!
	parent.once('apie::start', function(data) {
		// start the cliServer for the Apiary administrators
		this.cliServer = CliServer(parent, data);
		this.cliServer.listen();
		
		//
		// TODO: When all servers are up and running change the process owner to the given uid/gid
		//
		
		// indicate to the parent that we are running!!
		parent.emit('child::running');
	});
	
	// called when the API Environment controller wants to stop this API Service
	parent.once('apie::stop', function() {
		// tell the parent I'm in a save state
		parent.emit('child::stopready');
	});
	
});