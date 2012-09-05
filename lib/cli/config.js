/**
 * config.js: Commands for the `config` resource in the apiary CLI.
 *
 * (C) 2010-2012, Nodejitsu Inc.
 * (C) 2011-2012, TTC/Sander Tolsma
 * See LICENSE file for license
 */
 
var path  = require('path'),
    app   = require('./index-new');


// Setup target file for `.apiaryconf`.
try {
  app.config.file({
    file: app.argv.jitsuconf || app.argv.j || '.apiaryconf',
    dir: process.cwd(),
    search: true
  });
}
catch (err) {
  console.log('Error parsing ' + app.config.stores.file.file.magenta);
  console.log(err.message);
  console.log('');
  console.log('This is most likely not an error in Apiary');
  console.log('Please check the ' + app.config.stores.file.file.magenta + ' file and try again!');
  console.log('');
  process.exit(1);
}


var defaults = {
  colors      : true,
  tmproot     : path.join(process.env.HOME, '.jitsu/tmp'),
  userconfig  : '.jitsuconf'
};

// Set defaults for `app.config`.
app.config.defaults(defaults);

// Use the `flatiron-cli-config` plugin for `apiary config *` commands
app.use(require('flatiron-cli-config'), {
  store: 'file',
  restricted: [
    'tmproot',
    'userconfig'
  ],
  before: {
    list: function () {
      var configFile = app.config.stores.file.file;

      var display = [
        'Hello here is the ' + configFile.grey + ' file:',
        'To change a property type:',
        'apiary config set <key> <value>'
      ];

      display.forEach(function (line) {
        app.log.help(line);
      });

      return true;
    }
  }
});

// Store the original `app.config.load()` function for later use.
var _load = app.config.load;


// Override `app.config.load` so that we can map some existing properties to their correct location.
app.config.load = function (callback) {
  _load.call(app.config, function (err, store) {
    if (err) {
      return callback(err, true, true, true);
    }

    app.config.set('userconfig', app.config.stores.file.file);
    
    callback && callback(null, store);
  });
};




/**
 * Do setup operations on the given Clip App instance
 * @param {ClipApp} app The Clip application instance to execute operations on
 */
/*module.exports = function setupConfig(app) {
	app.usage('/config', function config(cmd, tty, end) {
		tty.info('');
		tty.info('apiary config'.bold.underline);
		tty.info('  Actions related to the apiary configuration file.');
		tty.info('');
		tty.info('notes'.bold);
		tty.info('  The configuration will be found recursively up the file system.');
		tty.info('  If no configuration file is found the HOME folder will be used.');
		tty.info('  A default configuration file will be created if none exist.');
		tty.info('');
		tty.info('commands'.bold);
		tty.info('  apiary config get'.green + ' <id>'.yellow);
		tty.info('  apiary config set'.green + ' <id> <value>'.yellow);
		tty.info('');
		tty.info('flags'.bold);
		tty.info('  -c --conf [.apiaryconf]    The file to use as our configuration');
		tty.info('');
		end();
	});
*/