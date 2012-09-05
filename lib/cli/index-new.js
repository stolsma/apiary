/**
 * index.js: General configuration of the Apiary CLI.
 *
 * Copyright 2011-2012 TTC/Sander Tolsma
 * See LICENSE file for license
 */

var path      = require('path'),
    colors    = require('colors'),
    flatiron  = require('flatiron');
    

// create the CLI application environment
var app = module.exports = flatiron.app;


// Setup to use `pkginfo` to expose version
require('pkginfo')(module, 'name', 'version');


app.use(flatiron.plugins.cli, {
  version: true,
  source: path.join(__dirname, 'commands'),
  argv: {
    version: {
      alias: 'v',
      description: 'print apiary version and exit',
      string: true
    }
  },
  usage: [
    'This is a basic flatiron cli application example!',
    '',
    'hello - say hello to somebody.'
  ]
});


// parse the argv options to config attributes
app.config.argv();


// Setup config, util functions, command aliases and prompt settings
app.prompt.properties = flatiron.common.mixin(
  app.prompt.properties,
  require('./properties')
);
app.prompt.override = app.argv;
app.apiaryUtils = require('./utils');
require('./config');


// Print welcome message.
app.welcome = function () {
  var welcome = [
      '',
      '     ___      .______    __       ___      .______    ____    ____ ', 
      '    /   \\     |   _  \\  |  |     /   \\     |   _  \\   \\   \\  /   / ',
      '   /  ^  \\    |  |_)  | |  |    /  ^  \\    |  |_)  |   \\   \\/   /  ',
      '  /  /_\\  \\   |   ___/  |  |   /  /_\\  \\   |      /     \\_    _/   ',
      ' /  _____  \\  |  |      |  |  /  _____  \\  |  |\\  \\-.     |  |     ',
      '/__/     \\__\\ | _|      |__| /__/     \\__\\ | _| `.__|     |__|     ',
      ''
    ].join('\n');

  app.log.info(welcome.green);
  app.log.info('Welcome to ' + 'Apiary'.green + ' v' + app.version);
  app.log.info('It worked if it ends with ' + 'Apiary'.grey + ' ok'.green.bold);
};


/**
 * ### function start (command, callback)
 * #### @command {string} Command to execute once started
 * #### @callback {function} Continuation to pass control to when complete.
 * Starts the jitsu CLI and runs the specified command.
 */
app.start = function (callback) {
  // Check for --no-colors/--colors option, without hitting the config file yet
  var useColors = (typeof app.argv.colors == 'undefined' || app.argv.colors);

  useColors || (colors.mode = "none");

  app.init(function (err) {
    if (err) {
      app.welcome();
      callback(err);
      return app.showError.apply(null, [command[0]].concat(arguments));
    }

    // --no-colors option turns off output coloring, and so does setting colors: false in ~/.apiaryconf
    if ( !app.config.get('colors') || !useColors ) {
      colors.mode = "none";
      app.log.get('default').stripColors = true;
      app.log.get('default').transports.console.colorize = false;
    }

    app.welcome();

    return app.exec(app.argv._, callback);
  });
};


/**
 * ### function exec (command, callback)
 * #### @command {string} Command to execute
 * #### @callback {function} Continuation to pass control to when complete.
 * Runs the specified command in the jitsu CLI.
 */
app.exec = function (command, callback) {
  function execCommand (err) {
    if (err) {
      return callback(err);
    }

    app.log.info('Executing command ' + command.join(' ').magenta);
    app.log.info('');
    app.router.dispatch('on', command.join(' '), app.log, function (err, shallow) {
      if (err) {
        callback(err);
        return app.showError(command.join(' '), err, shallow);
      }

      callback();
    });
  }

  return execCommand();
};


/**
 * ### function showError (command, err, shallow, skip)
 * #### @command {string} Command which has errored.
 * #### @err {Error} Error received for the command.
 * #### @shallow {boolean} Value indicating if a deep stack should be displayed
 * #### @skip {boolean} Value indicating if this error should be forcibly suppressed.
 * Displays the `err` to the user for the `command` supplied.
 */
app.showError = function (command, err, shallow, skip) {
  var stack;

  if (!skip) {
    app.log.error('Error running command ' + command.magenta);
    
    if (err.message) {
      app.log.error(err.message);
    }

    if (err.result) {
      if (err.result.error) {
        app.log.error(err.result.error);
      }

      if (err.result.result && err.result.result.error) {
        if (err.result.result.error.stderr || err.result.result.error.stdout) {
          app.log.error('');
          app.log.error('There was an error while attempting to start the app');
          app.log.error(err.result.result.error.message);
          if (err.result.result.error.blame) {
            app.log.error(err.result.result.error.blame.message);
            app.log.error('');
            app.log.error('This type of error is usually a ' + err.result.result.error.blame.type + ' error.');
          }
          
          app.log.error('Error output from app:');
          app.log.error('');
          if (err.result.result.error.stdout) {
            err.result.result.error.stdout.split('\n').forEach(function (line) {
              app.log.error(line);
            });
          }
          
          if (err.result.result.error.stderr) {
            err.result.result.error.stderr.split('\n').forEach(function (line) {
              app.log.error(line);
            });
          }
        }
        else if (err.result.result.error.stack) {
          app.log.error('There was an error while attempting to deploy the app');
          app.log.error('');
          app.log.error(err.result.result.error.message);
          
          if (err.result.result.error.blame) {
            app.log.error(err.result.result.error.blame.message);
            app.log.error('');
            app.log.error('This type of error is usually a ' + err.result.result.error.blame.type + ' error.');
          }
          
          app.log.error('Error output from Haibu:');
          app.log.error('');
          stack = err.result.result.error.result || err.result.result.error.stack;
          stack.split('\n').forEach(function (line) {
            app.log.error(line);
          });
        }
      }
      else if (err.result.stack) {
        app.log.warn('Error returned from Nodejitsu');
        err.result.stack.split('\n').forEach(function (line) {
          app.log.error(line);
        });
      }
    }
    else {
      if (err.stack && !shallow) {
        if(err.message && err.message === 'socket hang up'){
          //nothing
        } else {
          err.stack.split('\n').forEach(function (trace) {
            err.log.error(trace);
          });
        }
      }
    }
  }
  app.log.help("For help with this error make an issue on:");
  app.log.help(" github: <https://github.com/stolsma/apiary/issues>");
  app.log.help("");
  app.log.help(" Copy and paste this output to a gist (http://gist.github.com/)");
  app.log.info('Apiary '.grey + 'not ok'.red.bold);
};


// start the CLI application and runs the specified command.
app.start(function (err) {
  if (!err) {
    app.log.info('Apiary'.grey + ' ok'.green.bold);
  }

  process.stdout.on('drain', function () {
    process.exit(err ? 1 : 0);
  });

  function onexit (/* code, status */) {
    if (err) {
      process.removeListener('exit', onexit);
      process.exit(1);
    }
  }

  process.on('exit', onexit);
});