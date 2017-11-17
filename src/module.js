(function(){
  var m = require('../lib/libkss')();
  if (typeof exports === 'object') {
    module.exports = m;
  } else if (typeof define === 'function' && define.amd) {
    define(function(){
      return m;
    });
  }
}());