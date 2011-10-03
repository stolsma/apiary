/**
* rpc.js: Create RPC communication over internal nodejs fork communication channel
* Using the dnode-protocol package: https://github.com/substack/dnode-protocol, Copyright 2010 James Halliday (mail@substack.net)
*
* Copyright 2011 TTC/Sander Tolsma
* See LICENSE file for license
*/

var protocol = require('dnode-protocol');

/**
 * Create this side of the RPC communications channel
 * @param {EventEmitter2} parent Instance which will emit events to the child and receive events from the child.
 * @param {Process/ChildProcess} child Instance which will receive/send 'messages' through the `message` event and `send()` function.
 * @param {Object} options Object with `delimiter` and `childDelimiter` configuration properties
 */
module.exports = function(parent, child, options) {
	// create a dnode-protocol session
	var session = protocol.Session(),
		remote = {};

	// On incoming events from the parent,
	// send those events as messages to the client
	function parentHandler() {
		var parts = this.event.split(options.delimiter),
			first = parts[0];
		
		// Only send if the client has a message function, the event has more then one part and
		// the event didn't originate from the child!
		if (remote.message && (parts.length > 1) && (first !== options.childDelimiter)) {
			session.remote.message.apply(null, [this.event].concat(Array.prototype.slice.call(arguments)));
		};
	}
	parent.onAny(parentHandler);


	// create the API to send and recieve messages between parent and child
	// receive messages from the client
	session.instance.message = function (event, data, callback) {
		parent.emit(options.childDelimiter + options.delimiter + event, data, callback);
   	};

	
	// Something went wrong inside the session instance
	session.on('error', function(err) {
		parent.emit('rpc::error', err);
	})
	
	// ah, the session want to send something to the other side so send through!
	session.on('request', function(req) {
		child.send(req);
	});
	
	// ah, the child send initial RPC functions to use on this session
	session.on('remote', function(remoteApi) {
		remote = remoteApi;
	});
	
	// ah, communication path is set up
	session.on('ready', function() {
		parent.emit('rpcready');
	});
	
	// session must stop!
	session.on('exit', function() {
		// remove eventhandler for this session from the parent
		parent.offAny(parentHandler);
	});
	
	// message coming from the other side so give it to the session to handle it!
	child.on('message', function(msg) {
		try { 
			session.handle(msg)
		} catch (err) {
			session.emit('error', err)
		}
	});
	
	// and startup RPC communications by sending local available functions/data
	session.start();
	
	// return session!!
	return session;
};