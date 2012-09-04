/**
 * apiary.js: Script wrap for starting the Apiary core process and controller.
 *
 * Copyright 2012 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @module apiary
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var intercom  = require('intercom'),
    fs        = require('fs'),
    path      = require('path');

/**
 * Get the configfile as defined on the commandline with -c
 */
function getConfig(cb) {
  var configfile  = '',
      config      = {};
  
  if (process.argv[2] !== '-c') {
    return new Error('Wrong commandline arguments!');
  }

  configfile = process.argv[3];
  if (!fs.existsSync(configfile)) {
    return new Error('Configuration file (' + configfile + ') does not exist!');
  }

  fs.readFile(configfile, function (err, data) {
    if (err) { return cb(err); }

    try {
      config = JSON.parse(data.toString());
    }
    catch (ex) {
      return cb(new Error('Error parsing the configuration file (' + configfile + ').'));
    }
        
    cb(null, config);
  });
}

/**
 * Start the Apiary Controller
 */
function startController(err, config) {
  if (err) { return err; }
  var spawnOptions = {
    visible       : true,
    silent        : false,
    minUptime     : 2000,             // Minimum time a child process has to be up. Process will 'close' otherwise.
    spinSleepTime : 1000,             // Interval between restarts if a child is spinning (i.e. alive < minUptime).
    cwd           : process.cwd(),
    options       : [],               // Additional arguments to pass to the script,
    spawnWith     : {
      detached    : true
    }
  };

  // start the main Apiary process
  var child = intercom.EventChild(path.join(__dirname, 'apiary.js'), spawnOptions);

  var started = false;
  
  // actions to execute when the Service is indicating that its initialized and running
  child.on('child::ready', function() {
    var options = {
      apiaryOptions : config.apiary,
      socket        : config.cli.socket,
      socketFile    : config.cli.socketFile,
      logs          : config.cli.logs.root
    };
    started = true;
    child.emit('child::start', options);
  });

  child.on('child::stopresult', function(err) {
    var result = err ? 1 : 0;
    child.stop();
    process.exit(result);
  });

  // Do some signal handling for SIGINT/ctrl-c (only react to it once!!!)
  process.on('SIGINT', function() {
    // stop the Apiary process
    if (started) child.emit('child::stop', {confirm: false});
    process.exit(0);
  });

  // start the main Apiary process
  child.start();
}

/**
 * Start the Apiary System with given options and logging to stdout and stderr
 * @param {Object} config Apiary CLI configuration option store
 * @param {Function} cb Callbck to continue with (err)
 */
function startMain() {
  var apiary    = require('../../apiary'),
      CliServer = require('../../sc/apis/cliserver');

  function stop(confirm) {
    apiary.stop(function(errList) {
      if (confirm) {
        process.parent.emit('child::stopresult', errList);
        //
        // And then wait until the parent (or someone else) kills me....
        //
      }
      else {
          process.exit(0);
      }
    });
  }

  // wait until comms is up and running and then request config
  process.parent.ready(function() {
    process.parent.emit('child::ready', {});
  });

  process.parent.on('child::start', function(options) {
    var apiaryOptions = options.apiaryOptions;
  
    // location of the APIE and SSE socket files and the location of the log files
    apiaryOptions.socket = apiaryOptions.socket || options.socket;
    apiaryOptions.logging = { location: options.logs };
    
    // and start the Apiary System with the given options
    apiary.start(apiaryOptions, function(err) {
      // TODO implement the correct location for the cli API, i.e. in the SCAPI Service
      // This is temporary!!!! : create a CliServer instance and start listening on the given socket
      apiary.cliServer = CliServer({
        socket  : path.join(options.socket, options.socketFile),
        uid     : apiary.config.get('system:uid') || 0,
        gid     : apiary.config.get('system:gid') || 0
      });
      
      apiary.cliServer.listen(function(err) {
        // Do some signal handling for SIGINT/ctrl-c (only react to it once!!!)
        process.once('SIGINT', function() {
            stop(true);
        });

        // return the result to the parent
        process.parent.emit('child::started', err);
      });
    });
  });
  
  // Function to execute when the parent asks us to stop
  process.parent.on('child::stop', function(data) {
    stop(data.confirm);
  });
}


// Check which instance we are running as
if (!process.parent) {
  // Get config and then start the main controller instance
  if (getConfig(startController)) process.exit(1);
} 
else {
  // this is the main Apiary instance so startup Apiary
  startMain();
}