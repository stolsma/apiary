# apiary

*spawn multi-system multi-user node.js clouds, on your own hardware and/or with 3rd party virtual servers*

# What is apiary?

apiary is the open-source project that uses [node.js](http://nodejs.org) and [haibu](https://github.com/nodejitsu/haibu) for spawning and managing several multi-user node.js applications on multiple (physical or virtual) servers. 

# How does it work?

apiary (which is English for 'beehive area') creates per (virtual) system per user application hives (or haibu). By using [haibu](https://github.com/nodejitsu/haibu) (which is Japanese for "hive"), node.js applications are transformed into "drones". This approach allows apiary and haibu to directly interact with node.js applications and add all sorts of additional functionality.

`apiary` builds on the concept of "drones" used in `haibu` and exposes a robust and granular API for interacting with your and others node.js applications acros multiple (virtual) systems. At a low level, apiaries API is exposed as a RESTFul HTTP webservice. Any system that supports basic HTTP requests can communicate with apiary controllers and installed applications. If you are working in Node.js, apiary comes with a high-level Node.js API client.

## Where can I run apiary?

`apiary` doesn't discriminate. If your environment supports node.js, you can install `apiary` and start up your own multi-system multi-user node.js cloud. This makes `apiary` an ideal tool for both development purposes and production usage since you can seamlessly setup `apiary` on your local machine, on utility computing providers (such as Amazon EC2 or Rackspace), on dedicated servers, or even on a mobile phone!

# Installation (to be implemented)

    sudo npm install apiary -g

# Documentation

apiaries documentation is still very much a work in progress. We'll be actively updating the documentation in the upcoming months to make it easier to get acclimated with `apiary`.

# An overview of using apiary

## Starting up an apiary environment

(to be described)



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
