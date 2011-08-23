/**
 * Service Runtime Environment API, a haibu-carapace plugin!
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

/**
 * @class Sre
 * @param {EventEmitter2} ee The EventEmitter to add the App API events to.
 * @param {haibu} The haibu singleton module to be used to execute the operations on.
 */
exports.start = function startAppApi(ee, droneApi) {
	/**
	 * @event app::start
	 * Fired to start an App in this SRE.
	 * @param {Object} config Config object with 'app' object and 'ready' function
	 */
	ee.on('*::app::start', onAppStart.bind(null, droneApi));
	
	/**
	 * @event app::stop
	 * Fired to stop an App in this SRE.
	 * @param {Object} config Config object with 'app' object and 'ready' function
	 */
	ee.on('*::app::stop', onAppStop.bind(null, droneApi));

	/**
	 * @event app::restart
	 * Fired to restart an App in this SRE.
	 * @param {Object} config Config object with 'app' object and 'ready' function
	 */
	ee.on('*::app::restart', onAppRestart.bind(null, droneApi));
	
	/**
	 * @event app::clean
	 * Fired to clean an App in this SRE.
	 * @param {Object} config Config object with 'app' object and 'ready' function
	 */
	ee.on('*::app::clean', onAppClean.bind(null, droneApi));
	
	/**
	 * @event app::update
	 * Fired to update an App in this SRE.
	 * @param {Object} config Config object with 'app' object and 'ready' function
	 */
	ee.on('*::app::update', onAppUpdate.bind(null, droneApi));
	
	/**
	 * @event app::show
	 * Fired to return information about the requetsed App in this SRE.
	 * @param {Object} config Config object with 'app' object and 'ready' function that is called with the app info as argument.
	 */
	ee.on('*::app::show', onAppShow.bind(null, droneApi));
	
	/**
	 * @event app::list
	 * Fired to return information about all known Apps in this SRE.
	 * @param {Object} config Config object with 'app' object and 'ready' function that is called with the app list info as argument.
	 */
	ee.on('*::app::list', onAppList.bind(null, droneApi));
}

/**
 * Will be called when the App API needs to be stopped
 * @param {EventEmitter2} ee The EventEmitter to remove the App API events from.
 */
exports.stop = function stopAppApi(ee) {
	ee.removeAllListeners('*::app::start');
	ee.removeAllListeners('*::app::stop');
	ee.removeAllListeners('*::app::restart');
	ee.removeAllListeners('*::app::clean');
	ee.removeAllListeners('*::app::update');
	ee.removeAllListeners('*::app::show');
	ee.removeAllListeners('*::app::list');
}

/**
 * React on the `app::start` event by starting an app
 */
function onAppStart(droneApi, data) {
	// start App
	droneApi.start(data.app, function (err, result) {
		data.ready(err, result);
	});
}

/**
 * Stop App
 */
function onAppStop(droneApi, data) {
	droneApi.stop(data.app.name, function (err, result) {
		data.ready(err, result);
	});
}

/**
 * Restart App
 */
function onAppRestart(droneApi, data) {
	droneApi.restart(data.app.name, function (err, result) {
		data.ready(err, result);
	});
}

/**
 * Clean App
 */
function onAppClean(droneApi, data) {
	droneApi.clean(data.app, function (err, result) {
		data.ready(err, result);
	});
}

/**
 * Update App
 */
function onAppUpdate(droneApi, data) {
	droneApi.update(data.app, function (err, result) {
		data.ready(err, result);
	});
}

/**
 * Show App information
 */
function onAppShow(droneApi, data) {
	data.ready(null, droneApi.show(data.app.name));
}

/**
 * React on the `app::list` event by calling data.ready with information about all running apps
 */
function onAppList(droneApi, data) {
	data.ready(null, droneApi.list());
}