(function () {
  "use strict";

  const { getModule } = require("./module");
  const encoding = require("encoding-japanese");
  const sha1 = require("js-sha1");

  /**
   * Create a new KSS object.
   * @name KSS
   * @constructor
   * @param {UInt8Array} data the KSS file binary.
   * @param {string} filename the name of the KSS file (used only for determine file type).
   * @param {number} [song=0] internal song index. (0 to 255)
   */
  class KSS {
    constructor(data, filename, song) {
      song = song || 0;
      if (256 * 65536 < data.length) {
        throw new Error("Wrong data format.");
      }

      const buf = getModule()._malloc(data.length);
      getModule().HEAPU8.set(data, buf);
      this.obj = getModule().ccall("KSS_bin2kss", "number", ["number", "number", "string"], [buf, data.length, filename]);
      if (this.obj == 0) {
        throw new Error("Can't create KSS object.");
      }
      this.song = song;
      this.data = data;
      getModule()._free(buf);
    }
    /**
     * get title string of the KSS file. This function assumes the title string of KSS is simple ASCII or SJIS encoded.
     * @method
     * @memberof KSS
     * @returns The title string if exists.
     */
    getTitle() {
      const ptr = getModule().ccall("KSS_get_title", "number", ["number"], [this.obj]);
      let i = 0;
      for (i = 0; i < 256; i++) {
        if (getModule().HEAPU8[ptr + i] == 0)
          break;
      }
      return encoding.convert(new Uint8Array(getModule().HEAPU8.buffer, ptr, i), {
        to: "UNICODE",
        from: "SJIS",
        type: "String"
      });
    }
    /**
     * Release the object. Without calling this method will cause memory-leak.
     * @method
     * @memberof KSS
     */
    release() {
      if (this.obj) {
        getModule().ccall("KSS_delete", null, ["number"], [this.obj]);
        this.obj = null;
        delete KSS.hashMap[this.hash];
      }
      else {
        throw new Error("KSS double-release: " + this.hash);
      }
    }
    /**
     * Destory all the cached KSS instances that generated from this library.
     * @memberof KSS
     * @static
     */
    static releaseAll() {
      for (const key in KSS.hashMap) {
        KSS.hashMap[key].release();
      }
    }
    /**
     * Create a unique KSS object. If the same data is given, this function returns the same KSS instance.
     * @param {UInt8Array} data the KSS file binary.
     * @param {string} filename the name of the KSS file.
     * @param {number} [song=0] internal song index.
     * @returns A KSS instance.
     * @memberof KSS
     * @static
     */
    static createUniqueInstance(data, filename, song) {
      song = song || 0;
      const hash = sha1.create();
      hash.update(data);
      const hashHex = "sha1:" + hash.hex() + ":" + song;

      let kss = KSS.hashMap[hashHex];
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
    }

    /**
     * Convert KSS to VGM
     * @param {number} options.duration maximum play time in milliseconds (default: 300000)
     * @param {number} options.song song number (default: 0)
     * @param {number} options.loop maximum loop count (default: 2)
     * @param {number} options.volume VGM volume multiplier (default: 0)
     * @returns A Uint8Array that contains VGM data.
     * @memberof KSS
     * @static
     */
    toVGM(options) {

      const opts = options || {};
      const duration = opts.duration || 300 * 1000;
      const song = opts.song || 0;
      const loop = opts.loop || 2;
      const volume = opts.volume || 0;

      const kss2vgm = getModule().ccall("KSS2VGM_new", null, ["number", "number"]);
      const result = getModule().ccall("KSS2VGM_kss2vgm", null, ["number", "number", "number", "number", "number", "number"], [kss2vgm, this.obj, duration, song, loop, volume]);
      const vgmPtr = getModule().ccall("KSS2VGM_Result_vgm_ptr", null, ["number"], [result]);
      const vgmSize = getModule().ccall("KSS2VGM_Result_vgm_size", null, ["number"], [result]);
      const vgm = new Uint8Array(getModule().HEAPU8.buffer, vgmPtr, vgmSize).slice();
      getModule().ccall("KSS2VGM_delete", null, ["number"], [kss2vgm]);
      getModule().ccall("KSS2VGM_Result_delete", null, ["number"], [result]);
      return vgm;
    }
  }

  KSS.hashMap = {};

  if (typeof exports === "object") {
    module.exports = KSS;
  } else if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define(function () {
      return KSS;
    });
  }
})();
