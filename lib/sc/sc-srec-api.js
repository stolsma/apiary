/**
 * SC RPC API for use by the SREC
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

/**
 * 
 */
exports = module.exports = function scSrecApi(srecFn, conn) {
	// function to show how bidirectional comms can be created
	this.request = function(msg, cb) {
		cb('ok');
	}
}

