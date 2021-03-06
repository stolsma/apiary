# apiary

*spawn multi-system multi-user [Node.JS] clouds, on your own hardware and/or with 3rd party virtual servers*

### Under development!!! Not stable yet!!!

# What is apiary?

Apiary is the open-source project that uses [Node.JS] and [haibu] for spawning and managing several multi-user [Node.JS] applications on multiple (physical or virtual) servers. 

# How does it work?

`apiary` (which is English for 'beehive area') creates per (virtual) system per user application hives (or haibu, which is Japanese for "hive"). By using [haibu], [Node.JS] applications are transformed into "drones". This approach allows `apiary` and [haibu] to directly interact with [Node.JS] applications and add all sorts of additional functionality.

`apiary` builds on the concept of "drones" used in [haibu] and exposes a robust and granular API for interacting with your and others [Node.JS] applications acros multiple (virtual) systems. At a low level, the API of `apiary` is exposed as a RESTFul HTTP webservice. Any system that supports basic HTTP requests can communicate with `apiary` System Environment Controllers and installed applications. If you are working in [Node.JS], `apiary` comes with a high-level [Node.JS] User Environment Controller javascript API client module.

## Where can I run apiary?

`apiary` doesn't discriminate. If your environment supports [Node.JS] (v4.x, not the new v5.x branch), you can install `apiary` and start up your own multi-system multi-user [Node.JS] cloud. This makes `apiary` an ideal tool for both development purposes and production usage since you can seamlessly setup `apiary` on your local machine, on utility computing providers (such as Amazon EC2 or Rackspace) or on dedicated servers!

# Installation

Apiary is available in the NPM repository and can be installed globally with:

`sudo npm install apiary -g`

# An overview of using Apiary

All CLI interaction has to be done as a user with root rights. On most Linux systems a user command can be 'upgraded' with root rights by using sudo...
With the -h flag help can be requested on all CLi commands:

`[sudo] apiary -h`

```
[sander@development examples]$ sudo ../bin/apiary -h
info: 
     ___      .______    __       ___      .______    ____    ____ 
    /   \     |   _  \  |  |     /   \     |   _  \   \   \  /   / 
   /  ^  \    |  |_)  | |  |    /  ^  \    |  |_)  |   \   \/   /  
  /  /_\  \   |   ___/  |  |   /  /_\  \   |      /     \_    _/   
 /  _____  \  |  |      |  |  /  _____  \  |  |\  \-.     |  |     
/__/     \__\ | _|      |__| /__/     \__\ | _| `.__|     |__|     

info: Running Apiary CLI version 0.0.2
info: Using CLI config file /home/sander/.apiaryconf
info: No Apiary System running!
info: Deployment script is /home/sander/Development/apiary/examples/deploy.json
info: Current application user: 
info: 
info: apiary
info:   CLI interface to manage an Apiary System.
info:   Please refer to documentation of commands using `-h` or `--help`.
info: 
info: commands
info:   apiary start
info:   apiary stop
info:   apiary status
info:   apiary clean
info:   apiary apps
info:   apiary config
info: 
info: flags
info:   -s --silent                Do not log to console
info:   -d --debug                 Log extended error messages
info:   -c --conf                  Configuration filename to use (default: .apiaryconf)
info: 
[sander@development examples]$ 
```

## Starting up an `apiary` environment

To start an Apiary system:

`[sudo] apiary start`

```
[sander@development examples]$ sudo ../bin/apiary start
info: 
     ___      .______    __       ___      .______    ____    ____ 
    /   \     |   _  \  |  |     /   \     |   _  \   \   \  /   / 
   /  ^  \    |  |_)  | |  |    /  ^  \    |  |_)  |   \   \/   /  
  /  /_\  \   |   ___/  |  |   /  /_\  \   |      /     \_    _/   
 /  _____  \  |  |      |  |  /  _____  \  |  |\  \-.     |  |     
/__/     \__\ | _|      |__| /__/     \__\ | _| `.__|     |__|     

info: Running Apiary CLI version 0.0.2
info: Using CLI config file /home/sander/.apiaryconf
info: No Apiary System running!
info: Deployment script is /home/sander/Development/apiary/examples/deploy.json
info: Current application user: 
info: 
info: Starting the Apiary system!
info: 
info: The Apiary system is started as daemon!
info: 
[sander@development examples]$ 
```

to stop a running Apairy system:

`[sudo] apiary stop`

### User configuration

To add a system user as an Apiary user:

`[sudo] apiary users add apiary_user_1`

To remove an Apiary user:

`[sudo] apiary users remove apiary_user_1`

To list all users configured on the Apiary system:

`[sudo] apiary users list`

To stop apps from, and remove an Apiary user and also clean the users filesystem of Apiary directories and files:

`[sudo] apiary users clean apiary_user_1`
 
### App configuration

To start an application described by examples/deploy.json:

`[sudo] apiary -f examples/deploy.json -u apiary_user_1 apps start`

To stop an application:

`[sudo] apiary -f examples/deploy.json -u apiary_user_1 apps stop`

To list all running applications:

`[sudo] apiary apps list`

To list all running applications for a specific user:

`[sudo] apiary apps list apiary_user_1`

To clean the user filesystem from all files related to a running app (and stop the app):

`[sudo] apiary -u apiary_user_1 apps clean test`

### deploy.json attribute settings

Apiary uses a .json formated file in order to determine what to deploy.
Also, `apiary` is a pull based server; this means that it will pull files from outside of the server in order to deploy instead of using uploading directly into the process.

A basic deploy.json for a node.js application on apiary:

```json
{
   "name": "test",
   "domain": "example.com",
   "repository": {
     "type": "git",
     "url": "https://github.com/stolsma/hellonode.git",
   },
   "scripts": {
     "start": "server.js"
   }
}
```

#### User

The user attribute is optional and will represent the system user which will own the application.
If not defined then the default system user setting of the `apiary` CLI will be used.

```json
{
  "user": "system user"
}
```

####Name

The name attribute is required and will represent the name of the application being deployed.

```json
{
  "name": "app-name"
}
```

####Repositories

Five application code repository types are supported.

##### git

This type of repository will pull a git repository into `apiary` and deploy its contents.
The branch attribute is optional!

```json
{
  "repository": {
    "type": "git",
    "url": "http://path/to/git/server",
	"branch": "branch name"
  }
}
```

##### local

This type of repository will pull a directory from the local file system into `apiary` and deploy its contents.

```json
{
  "repository": {
    "type": "local",
    "directory": "/path/to/application"
  }
}
```

##### tar

This type of repository will pull a remote tar archive into the `apiary` system and deploy its contents.

```json
{
  "repository": {
    "type": "tar",
    "url": "http://path/to/archive.tar"
  }
}
```

##### zip

This type of repository will pull a remote zip archive to the `apiary` system and deploy its contents.

```json
{
  "repository": {
    "type": "zip",
    "url": "http://path/to/archive.zip"
  }
}
```

##### npm

This type of repository will install a npm package as application. The package will be available as directory under its name and the scripts will be installed in the `.bin` directory.
So scripts.start should have one of both as relative directory:

```json
"scripts": {
  "start": ".bin/server.js"
}
```

or:

```json
"scripts": {
  "start": "name of npm package/server.js"
}
```

```json
{
  "repository": {
    "type": "npm",
    "package": "name of npm package following package.json dependencies rules"
  }
}
```


# Code documentation

The code documentation of `apiary` is still very much a work in progress. We'll be actively updating the documentation in the upcoming months to make it easier to contribute code to `apiary`.

A first preview of the current alpha documentation can be found [here](https://github.com/stolsma/apiary/blob/master/docs/index.md)!

## Run Tests
All of the `apiary` tests are written in [vows], and cover all of the use cases described above.

the tests can be started by typing `npm test` in the `apiary` directory.  

(To be implemented)


Open Source Projects Used
=========================

`apiary` wouldn't exists weren't for the wildly productive [Node.JS] community producing so many high quality software.
Especially many thanks to the [Nodejitsu] people for writing such nice code ([haibu], [forever], [hook.io]). I learned a lot about javascript coding by just looking through their code!!

Main projects that we use as building blocks:

  * [async] by [caolan]
  * [clip] by [bmeck]
  * [colors] by [marak]
  * [dnode] by [substack]
  * [eventemitter2] by [hij1nx]
  * [eyes] by [cloudhead]
  * [forever] by [indexzero]
  * [haibu] by [Nodejitsu]
  * [haibu-carapace] by [Nodejitsu]
  * [hook.io] by [marak] and others [hookio]
  * [nconf] by [indexzero]
  * [optimist] by [substack]
  * and of course [Node.JS]!
  
Thanks to all developers and contributors of these projects! 

Documentation License
=====================

Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License

http://creativecommons.org/licenses/by-nc-sa/3.0/

Copyright (c)2011 [TTC](http://www.tolsma.net)/[Sander Tolsma](http://sander.tolsma.net/)


Code License
============

[MIT License](http://www.opensource.org/licenses/mit-license.php)

Copyright (c)2011 [TTC](http://www.tolsma.net)/[Sander Tolsma](http://sander.tolsma.net/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.


[bmeck]: https://github.com/bmeck
[caolan]: https://github.com/caolan
[cloudhead]: https://github.com/cloudhead
[hij1nx]: https://github.com/hij1nx
[hookio]: https://github.com/hookio
[indexzero]: https://github.com/indexzero
[marak]: https://github.com/Marak
[Nodejitsu]: http://nodejitsu.com
[substack]: https://github.com/substack

[async]: https://github.com/caolan/async
[clip]: https://github.com/bmeck/clip
[colors]: https://github.com/Marak/colors.js
[dnode]: https://github.com/substack/dnode
[eventemitter2]: https://github.com/hij1nx/EventEmitter2
[eyes]: https://github.com/cloudhead/eyes.js
[forever]: https://github.com/indexzero/forever
[haibu]: https://github.com/nodejitsu/haibu
[haibu-carapace]: https://github.com/nodejitsu/haibu-carapace
[hook.io]: https://github.com/hookio/hook.io
[nconf]: https://github.com/indexzero/nconf
[optimist]: https://github.com/substack/node-optimist
[Node.JS]: http://nodejs.org/
[vows]: http://vowsjs.org