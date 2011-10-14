/**
 * Service Runtime Environment API, a haibu-carapace plugin!
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

/**
 * @class Sre
 * @param {EventEmitter2} ee The EventEmitter to add the App API events to.
 */
exports.start = function startAppApi(ee, droneApi) {
	/**
	 * @event app::start
	 * Fired to start an App in this SRE.
	 * @param {Object} config Config object with 'app' object and 'ready' function
	 */
	ee.on('app::start', onAppStart.bind(ee, droneApi));
	
	/**
	 * @event app::stop
	 * Fired to stop an App in this SRE.
	 * @param {Object} config Config object with 'app' object and 'ready' function
	 */
	ee.on('app::stop', onAppStop.bind(ee, droneApi));

	/**
	 * @event app::restart
	 * Fired to restart an App in this SRE.
	 * @param {Object} config Config object with 'app' object and 'ready' function
	 */
	ee.on('app::restart', onAppRestart.bind(ee, droneApi));
	
	/**
	 * @event app::clean
	 * Fired to clean an App in this SRE.
	 * @param {Object} config Config object with 'app' object and 'ready' function
	 */
	ee.on('app::clean', onAppClean.bind(ee, droneApi));
	
	/**
	 * @event app::update
	 * Fired to update an App in this SRE.
	 * @param {Object} config Config object with 'app' object and 'ready' function
	 */
	ee.on('app::update', onAppUpdate.bind(ee, droneApi));
	
	/**
	 * @event app::show
	 * Fired to return information about the requetsed App in this SRE.
	 * @param {Object} config Config object with 'app' object and 'ready' function that is called with the app info as argument.
	 */
	ee.on('app::show', onAppShow.bind(ee, droneApi));
	
	/**
	 * @event app::list
	 * Fired to return information about all known Apps in this SRE.
	 * @param {Object} config Config object with 'app' object and 'ready' function that is called with the app list info as argument.
	 */
	ee.on('app::list', onAppList.bind(ee, droneApi));
}

/**
 * Will be called when the App API needs to be stopped
 * @param {EventEmitter2} ee The EventEmitter to remove the App API events from.
 */
exports.stop = function stopAppApi(ee) {
	ee.removeAllListeners('app::start');
	ee.removeAllListeners('app::stop');
	ee.removeAllListeners('app::restart');
	ee.removeAllListeners('app::clean');
	ee.removeAllListeners('app::update');
	ee.removeAllListeners('app::show');
	ee.removeAllListeners('app::list');
}

/**
 * React on the `app::start` event by starting an app
 */
function onAppStart(droneApi, app, rEvent) {
	var self = this;
	
	// do try.. catch because of throw in repository.create
	try {
		droneApi.start(app, function (err, result) {
			self.emit(rEvent, err, result);
		});
	} catch (err) {
		data.ready(err);
	}
}

/**
 * Stop App
 */
function onAppStop(droneApi, app, rEvent) {
	var self = this;
	droneApi.stop(app.name, function (err, result) {
		self.emit(rEvent, err, result);
	});
}

/**
 * Restart App
 */
function onAppRestart(droneApi, app, rEvent) {
	var self = this;
	droneApi.restart(app.name, function (err, result) {
		self.emit(rEvent, err, result);
	});
}

/**
 * Clean App
 */
function onAppClean(droneApi, app, rEvent) {
	var self = this;
	droneApi.clean(app, function (err, result) {
		self.emit(rEvent, err, result);
	});
}

/**
 * Update App
 */
function onAppUpdate(droneApi, app, rEvent) {
	var self = this;
	droneApi.update(app, function (err, result) {
		self.emit(rEvent, err, result);
	});
}

/**
 * Show App information
 */
function onAppShow(droneApi, app, rEvent) {
	this.emit(rEvent, null, droneApi.show(app.name));
}

/**
 * React on the `app::list` event by calling data.ready with information about all running apps
 */
function onAppList(droneApi, app, rEvent) {
	this.emit(rEvent, null, droneApi.list());
}