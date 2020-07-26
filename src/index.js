(function () {
  "use strict";

  const m = {
    KSS: require("./kss"),
    KSSPlay: require("./kssplay"),
  };

  if (typeof exports === "object") {
    module.exports = m;
  } else if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define(function () {
      return m;
    });
  }
})();
