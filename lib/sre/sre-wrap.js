/**
 * System Runtime Environment/Haibu startup wrapper module
 * This is the location to manipulate the SRE Controller environment variables like globals etc
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

// create new SRE Controller API
module.exports = new (require('./sre-api'));