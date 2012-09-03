/**
 * clone.js: Real, deep copied objects utility function
 *
 * Copyright 2011-2012 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * Copyright 2011 Marco Rogers
 * https://gist.github.com/1239728/2a25dbebb7c96098823596d317c5283b13098f66
 * Website/Blog: http://marcorogers.com/
 * Company: Yammer Inc
 * Location: San Francisco, CA 
 */

/**
 * Real, deep copied objects utility function
 * @param {Object/Array} obj Object to clone
 * @returns {Object/Array} Cloned object
 */
module.exports = function clone(obj) {
  if (Array.isArray(obj)) {
    return [].slice.call(obj, 0);
  }

  // Create a new object whose prototype is a new, empty object,
  // Using the second propertiesObject argument to copy the source properties
  return Object.create({}, (function(src) {
    var props = Object.getOwnPropertyNames(src),
        dest  = {};

    props.forEach(function(name) {
      var descriptor = Object.getOwnPropertyDescriptor(src, name);

      // Recurse on properties whose value is an object or array
      if (typeof src[name] === "object" ) {
        descriptor.value = clone(src[name]);
      }
      
      dest[name] = descriptor;
    });

    return dest;
  })(obj));
}


/**
 * ES5 Object.prototype.hasOwnProperty implementation
 */
function hasOwnProperty(key) {
  if(this[key]) {
    var proto = this.prototype;
    if(proto) {
      return ((key in this.prototype) && (this[key] === this.prototype[key]));
    }
    return true;
  }
  else {
    return false;
  }
}
if(!Object.prototype.hasOwnProperty) { Object.prototype.hasOwnProperty = hasOwnProperty; }


/**
 * ES5 Object.create implementation
 */
function create(o) {
  if (arguments.length > 1) {
    throw new Error('Object.create implementation only accepts the first parameter.');
  }
  function F() {}
  F.prototype = o;
  return new F();
}
if(!Object.create) { Object.create = create; }


/**
 * ES5 Array.isArray implementation 
 */
function isArray(obj) {
  return Object.prototype.toString.call(obj) === '[object Array]';
}
if(!Array.isArray) { Array.isArray = isArray; }