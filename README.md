# apiary

*spawn multi-system multi-user node.js clouds, on your own hardware and/or with 3rd party virtual servers*

# What is apiary?

Apiary is the open-source project that uses [Node.JS] and [haibu] for spawning and managing several multi-user node.js applications on multiple (physical or virtual) servers. 

# How does it work?

`apiary` (which is English for 'beehive area') creates per (virtual) system per user application hives (or haibu). By using [haibu] (which is Japanese for "hive"), node.js applications are transformed into "drones". This approach allows `apiary` and [haibu] to directly interact with node.js applications and add all sorts of additional functionality.

`apiary` builds on the concept of "drones" used in [haibu] and exposes a robust and granular API for interacting with your and others node.js applications acros multiple (virtual) systems. At a low level, the API of `apiary` is exposed as a RESTFul HTTP webservice. Any system that supports basic HTTP requests can communicate with `apiary` System Controllers and installed applications. If you are working in [Node.JS], `apiary` comes with a high-level [Node.JS] API client.

## Where can I run `apiary`?

`apiary` doesn't discriminate. If your environment supports [Node.JS], you can install `apiary` and start up your own multi-system multi-user [Node.JS] cloud. This makes `apiary` an ideal tool for both development purposes and production usage since you can seamlessly setup `apiary` on your local machine, on utility computing providers (such as Amazon EC2 or Rackspace), on dedicated servers, or even on a mobile phone!

# Installation (to be implemented)

    sudo npm install apiary -g

# Documentation

The documentation of `apiary` is still very much a work in progress. We'll be actively updating the documentation in the upcoming months to make it easier to get acclimated with `apiary`.

# An overview of using apiary

## Starting up an `apiary` environment

(to be described)


Open Source Projects Used
=========================

`apiary` wouldn't exists weren't for the wildly productive [Node.JS] community producing so many high quality software.
Especially many thanks to the [Nodejitsu] people for writing such nice code ([haibu], [forever], [hook.io]). I learned a lot about coding by just looking through their code!!

Main projects that we use as building blocks:

  * [async] by [fjakobs]
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
  * [optimist by [substack]
  * and of course [Node.JS]!
  
Thanks to all developers and contributors of these projects! 

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
