/**
 * Service Runtime Environment API, a haibu-carapace plugin!
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 */

exports.start = function startAppApi(ee, haibu) {
	ee.on('*::app::start', onAppStart.bind(null, haibu));
	
	ee.on('*::app::stop', onAppStop.bind(null, haibu));

	ee.on('*::app::restart', onAppRestart.bind(null, haibu));
	
	ee.on('*::app::clean', onAppClean.bind(null, haibu));
	
	ee.on('*::app::update', onAppUpdate.bind(null, haibu));
	
	ee.on('*::app::show', onAppShow.bind(null, haibu));
	
	/**
	 * React on the `app::list` event
	 */
	ee.on('*::app::list', onAppList.bind(null, haibu));
}

exports.stop = function stopAppApi(ee) {
	ee.removeAllListeners('*::app::start');
	ee.removeAllListeners('*::app::stop');
	ee.removeAllListeners('*::app::restart');
	ee.removeAllListeners('*::app::clean');
	ee.removeAllListeners('*::app::update');
	ee.removeAllListeners('*::app::show');
	ee.removeAllListeners('*::app::list');
}

// And following are the event reaction functions

/**
 * React on the `app::start` event by starting an app
 */
function onAppStart(haibu, data) {
	// start App
	haibu.running.drone.start(data.app, function (err, result) {
		data.ready(err, result);
	});
}

function onAppStop(haibu, data) {
	// stop App
	haibu.running.drone.stop(data.app.name, function (err, result) {
		data.ready(err, result);
	});
}

function onAppRestart(haibu, data) {
	// restart App
	haibu.running.drone.restart(data.app.name, function (err, result) {
		data.ready(err, result);
	});
}

function onAppClean(haibu, data) {
	// clean App
	haibu.running.drone.clean(data.app, function (err, result) {
		data.ready(err, result);
	});
}

function onAppUpdate(haibu, data) {
	// update App
	haibu.running.drone.update(data.app, function (err, result) {
		data.ready(err, result);
	});
}

function onAppShow(haibu, data) {
	// show App
	data.ready(null, haibu.running.drone.show(data.app.name));
}

/**
 * React on the `app::list` event
 */
function onAppList(haibu, data) {
	data.ready(null, haibu.running.drone.list());
}