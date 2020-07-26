(function () {
  const emscriptenModuleFactory = require("../lib/libkss");
  let _loaderPromise = null;
  let _emscriptenModule = null;
  const m = {
    initModule: async function () {
      if (_loaderPromise == null) {
        _loaderPromise = emscriptenModuleFactory().then((module) => {
          _emscriptenModule = module;
        }).catch((reason) => {
          console.error(reason);
          _loaderPromise = null;
        });
      }
      return _loaderPromise;
    },
    getModule: function () {
      if (_emscriptenModule == null) throw new Error("libkss module is not initialized.");
      return _emscriptenModule;
    }
  };
  if (typeof exports === "object") {
    module.exports = m;
  } else if (typeof define === "function" && define.amd) {
    define(function () {
      return m;
    });
  }
})();
