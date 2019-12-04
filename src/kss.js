(function() {
  "use strict";

  var Module = require("./module");
  var encoding = require("encoding-japanese");
  var crypto = require("crypto");
  var alg = "sha1";

  /**
   * Create a new KSS object.
   * @name KSS
   * @constructor
   * @param {UInt8Array} data the KSS file binary.
   * @param {string} filename the name of the KSS file (used only for determine file type).
   * @param {number} [song=0] internal song index. (0 to 255)
   */
  var KSS = function(data, filename, song) {
    song = song || 0;
    if (256 * 65536 < data.length) {
      throw new Error("Wrong data format.");
    }

    var buf = Module._malloc(data.length);
    Module.HEAPU8.set(data, buf);
    this.obj = Module.ccall("KSS_bin2kss", "number", ["number", "number", "string"], [buf, data.length, filename]);
    if (this.obj == 0) {
      throw new Error("Can't create KSS object.");
    }
    this.song = song;
    Module._free(buf);
  };

  KSS.hashMap = {};
  /**
   * Destory all the cached KSS instances that generated from this library.
   * @memberof KSS
   * @static
   */
  KSS.releaseAll = function() {
    for (var key in KSS.hashMap) {
      KSS.hashMap[key].release();
    }
  };

  /**
   * Create a unique KSS object. If the same data is given, this function returns the same KSS instance.
   * @param {UInt8Array} data the KSS file binary.
   * @param {string} filename the name of the KSS file.
   * @param {number} [song=0] internal song index.
   * @returns A KSS instance.
   * @memberof KSS
   * @static
   */
  KSS.createUniqueInstance = function(data, filename, song) {
    song = song || 0;
    var hash = crypto.createHash(alg);
    hash.update(data);
    var hashHex = alg + ":" + hash.digest("hex") + ":" + song;

    var kss = KSS.hashMap[hashHex];
    if (kss) {
      return kss;
    }

    kss = new KSS(data, filename, song);
    kss.hash = hashHex;
    KSS.hashMap[kss.hash] = kss;

    // KSCC
    if (data[0] == 75 && data[1] == 83 && data[2] == 67 && data[3] == 67) {
      kss.hasMultiSongs = true;
    }

    // KSSX
    if (data[0] == 75 && data[1] == 83 && data[2] == 83 && data[3] == 88) {
      kss.hasMultiSongs = true;
    }

    return kss;
  };

  /**
   * Load KSS file from URL.
   * @param {string} url
   * @param {Function} [complete] - callback for load completion.
   * @memberof KSS
   * @static
   */
  KSS.loadFromUrl = function(url, complete) {
    var xhr = new XMLHttpRequest();

    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";

    var err;

    xhr.addEventListener("load", function() {
      if (xhr.status == 200 || xhr.status == 304 || xhr.status == 0) {
        try {
          var kss = KSS.createUniqueInstance(new Uint8Array(xhr.response), url);
          if (complete) complete(kss, url);
        } catch (e) {
          if (complete) complete(e, url);
        }
      } else if (xhr.status == 404) {
        err = new Error("File Not Found: " + url);
        if (complete) complete(err, url);
      } else {
        err = new Error(xhr.statusText);
        if (complete) complete(err, url);
      }
    });

    xhr.addEventListener("error", function() {
      var err = new Error(
        'Load Error: Check "Access-Control-Allow-Origin" header is present for the target resource. See browser\'s development panel for detail. If you run this script local Chrome, `--allow-file-access-from-files` option is required.'
      );
      if (complete) complete(err, url);
    });
    xhr.send();
  };

  /**
   * get title string of the KSS file. This function assumes the title string of KSS is simple ASCII or SJIS encoded.
   * @method
   * @memberof KSS
   * @returns The title string if exists.
   */
  KSS.prototype.getTitle = function() {
    var ptr = Module.ccall("KSS_get_title", "number", ["number"], [this.obj]);
    var i;
    for (i = 0; i < 256; i++) {
      if (Module.HEAPU8[ptr + i] == 0) break;
    }
    return encoding.convert(new Uint8Array(Module.HEAPU8.buffer, ptr, i), {
      to: "UNICODE",
      from: "SJIS",
      type: "String"
    });
  };

  /**
   * Release the object. Without calling this method will cause memory-leak.
   * @method
   * @memberof KSS
   */
  KSS.prototype.release = function() {
    if (this.obj) {
      Module.ccall("KSS_delete", null, ["number"], [this.obj]);
      this.obj = null;
      delete KSS.hashMap[this.hash];
    } else {
      throw new Error("KSS double-release: " + this.hash);
    }
  };

  if (typeof exports === "object") {
    module.exports = KSS;
  } else if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define(function() {
      return KSS;
    });
  }
})();
