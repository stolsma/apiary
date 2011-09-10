# apiary

*spawn multi-system multi-user [Node.JS] clouds, on your own hardware and/or with 3rd party virtual servers*

# What is apiary?

Apiary is the open-source project that uses [Node.JS] and [haibu] for spawning and managing several multi-user [Node.JS] applications on multiple (physical or virtual) servers. 

# How does it work?

`apiary` (which is English for 'beehive area') creates per (virtual) system per user application hives (or haibu). By using [haibu] (which is Japanese for "hive"), [Node.JS] applications are transformed into "drones". This approach allows `apiary` and [haibu] to directly interact with [Node.JS] applications and add all sorts of additional functionality.

`apiary` builds on the concept of "drones" used in [haibu] and exposes a robust and granular API for interacting with your and others [Node.JS] applications acros multiple (virtual) systems. At a low level, the API of `apiary` is exposed as a RESTFul HTTP webservice. Any system that supports basic HTTP requests can communicate with `apiary` System Environment Controllers and installed applications. If you are working in [Node.JS], `apiary` comes with a high-level [Node.JS] System Environment Controller API client.

## Where can I run apiary?

`apiary` doesn't discriminate. If your environment supports [Node.JS], you can install `apiary` and start up your own multi-system multi-user [Node.JS] cloud. This makes `apiary` an ideal tool for both development purposes and production usage since you can seamlessly setup `apiary` on your local machine, on utility computing providers (such as Amazon EC2 or Rackspace), on dedicated servers, or even on a mobile phone!

# Installation (to be implemented)

`sudo npm install apiary -g`

# An overview of using apiary

## Starting up an `apiary` environment

To start an apiary system:

`[sudo] apiary start`

to stop a running apairy system:

`[sudo] apiary stop`

### Using the apiary CLI

To start an application:

`[sudo] apiary -f examples/deploy.json apps start`

To stop an application:

`[sudo] apiary -f examples/deploy.json apps stop`

(to be described further)

### deploy.json attribute settings

Apiary uses a .json formated file in order to determine what to deploy.
Also, `apiary` is a pull based server; this means that it will pull files from outside of the server in order to deploy instead of using uploading directly into the process.

A basic deploy.json for a node.js application on apiary:

```json
{
   "user": "apiary_user_1",
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

Five repository types are supported.

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

The code documentation of `apiary` is still very much a work in progress. We'll be actively updating the documentation in the upcoming months to make it easier to get acclimated with `apiary`.

A first preview can be found [here](https://github.com/stolsma/apiary/blob/master/docs/index.md)!

## Run Tests
All of the `apiary` tests are written in [vows], and cover all of the use cases described above.

the tests can be started by typing `npm test` in the `apiary` directory.  

(To be implemented)


Open Source Projects Used
=========================

`apiary` wouldn't exists weren't for the wildly productive [Node.JS] community producing so many high quality software.
Especially many thanks to the [Nodejitsu] people for writing such nice code ([haibu], [forever], [hook.io]). I learned a lot about coding by just looking through their code!!

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
[vows]: [0]: http://vowsjs.org