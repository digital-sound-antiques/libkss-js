(function () {
  'use strict';

  var LIB = function(){};
  LIB.KSS = require('./kss');
  LIB.KSSPlay = require('./kssplay');

  if (typeof exports === 'object') {
    module.exports = LIB;
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(function(){
      return LIB;
    });
  }
}());