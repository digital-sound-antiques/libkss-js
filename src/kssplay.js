(function () {
  "use strict";

  const { initModule, getModule } = require("./module");

  function deviceNameToId(name) {
    if (name === "psg" || name === "ym2149" || name === "ay-3-8910") {
      return 0;
    }
    if (name === "scc" || name === "scc+") {
      return 1;
    }
    if (name === "ym2413" || name == "opll") {
      return 2;
    }
    if (name === "y8950" || name == "opl") {
      return 3;
    }
    return -1;
  }

  class KSSPlay {
    /**
     * Initialize library. Must be called with await before using KSS and KSSPlay classes.
     * @returns a Promise<void> object.
     */
     static initialize() {
      return initModule();
    }

    /**
     * Create a new KSS player instance.
     * @name KSSPlay
     * @constructor
     * @param {number} [rate=44100] - The audio playback rate.
     */
    constructor(rate) {
      this._kssplay = getModule().ccall("KSSPLAY_new", "number", ["number", "number", "number"], [rate || 44100, 1, 16]);
      this._buffer = null;
      this._song = 0;
    }

    /**
     * Specify the playback quality of the devices.
     * @method
     * @memberof KSSPlay
     * @param {Object} config
     * @param {number} [config.psg] - 0:low 1:high
     * @param {number} [config.scc] - 0:low 1:high
     * @param {number} [config.opll] - 0:low 1:high
     * @param {number} [config.opl] - 0:low 1:high
     */
    setDeviceQuality(config) {
      config = config || {};
      for (var key in config) {
        var devId = deviceNameToId(key);
        var quality = config[key];
        if (0 <= devId) {
          getModule().ccall(
            "KSSPLAY_set_device_quality",
            null,
            ["number", "number", "number"],
            [this._kssplay, devId, quality]
          );
        }
      }
    }
    /**
     * Set the kss object for playing.
     * @method
     * @memberof KSSPlay
     * @param {KSS} kss - kss instance.
     */
    setData(kss) {
      this._song = kss.song;
      getModule().ccall("KSSPLAY_set_data", null, ["number", "number"], [this._kssplay, kss.obj]);
    }
    /**
     * Resets the player.
     * @method
     * @memberof KSSPlay
     * @param {number} [song=0|null] The song number to play. If null, song index stored in KSS object is used.
     * @param {number} [cpuSpeed=0] 0:auto, <=1: cpu speed factor.
     */
    reset(song, cpuSpeed) {
      getModule().ccall(
        "KSSPLAY_reset",
        null,
        ["number", "number", "number"],
        [this._kssplay, song || this._song, cpuSpeed || 0]
      );
    }
    _ensureBufferSize(size) {
      if (this._buffer != null && this._buffer.length < size) {
        getModule()._free(this._buffer);
        this._buffer = null;
      }
      if (this._buffer == null) {
        this._buffer = getModule()._malloc(size);
      }
    }
    /**
     * Calculate specified length of wave samples.
     * @method
     * @memberof KSSPlay
     * @param {number} samples The number of samples to render.
     * @returns {Int16Array} The generated samples.
     */
    calc(samples) {
      this._ensureBufferSize(samples * 2);
      this.calcToBuffer(this._buffer, samples);
      return new Int16Array(getModule().HEAPU8.buffer, this._buffer, samples).slice();
    }
    /**
     * @method
     * @memberof KSSPlay
     * @param {number} buffer The pointer to the sample buffer.
     * @param {number} samples The number of samples to render.
     */
    calcToBuffer(buffer, samples) {
      getModule().ccall("KSSPLAY_calc", null, ["number", "number", "number"], [this._kssplay, buffer, samples]);
    }
    /**
     * Calculate specified length without rendering wave.
     * @method
     * @memberof KSSPlay
     * @param {number} samples The number of samples to calculate.
     */
    calcSilent(samples) {
      getModule().ccall("KSSPLAY_calc_silent", null, ["number", "number"], [this._kssplay, samples]);
    }
    /**
     * Get the number of loops of the current playing music.
     * @method
     * @memberof KSSPlay
     * @returns The number of the current loop counts.
     */
    getLoopCount() {
      return getModule().ccall("KSSPLAY_get_loop_count", "number", ["number"], [this._kssplay]);
    }
    /**
     * Get progress of the fading-out.
     * @returns 0: Not started, 1: In progress, 3: Completed.
     */
    getFadeFlag() {
      return getModule().ccall("KSSPLAY_get_fade_flag", "number", ["number"], [this._kssplay]);
    }
    /**
     * Set the limit of the slient length. The player automatically stops if it detects silent longer than this limit.
     * @method
     * @memberof KSSPlay
     * @param {number} time maximum silent span in millis.
     */
    setSilentLimit(time) {
      getModule().ccall("KSSPLAY_set_silent_limit", null, ["number", "number"], [this._kssplay, time]);
    }
    /**
     * Starts the fade-out.
     * @method
     * @memberof KSSPlay
     * @param {number} duration fade-out duration in millis.
     */
    fadeStart(duration) {
      getModule().ccall("KSSPLAY_fade_start", null, ["number", "number"], [this._kssplay, duration]);
    }
    /**
     * Check the player is stopped or not.
     * @method
     * @memberof KSSPlay
     * @returns 0: not stopped, 1: stopped.
     */
    getStopFlag() {
      return getModule().ccall("KSSPLAY_get_stop_flag", "number", ["number"], [this._kssplay]);
    }
    /**
     * Set RC low-pass filter params.
     * @method
     * @memberof KSSPlay
     * @param {number} r - Registor (OM)
     * @param {number} c - Capacitor (nF)
     */
    setRCF(r, c) {
      return getModule().ccall("KSSPLAY_set_rcf", null, ["number", "number"], [this._kssplay, r, c]);
    }
    /**
     * Release the object. Without calling this method will cause memory-leak.
     * @method
     * @memberof KSSPlay
     */
    release() {
      getModule().ccall("KSSPLAY_delete", null, ["number"], [this._kssplay]);
      if (this._memwrite_handler) {
        getModule().removeFunction(this._memwrite_handler);
        this._memwrite_handler = null;
      }
      if (this._iowrite_handler) {
        getModule().removeFunction(this._iowrite_handler);
        this._iowrite_handler = null;
      }
      this._kssplay = null;
      if (this._buffer != null) {
        getModule()._free(this._buffer);
        this._buffer = null;
      }
    }
    /**
     * @callback KSSPlay~IOWriteHandler
     * @param {KSSPlay} context
     * @param {number} adr
     * @param {number} data
     */
    /**
     * Set I/O write handler
     * @method
     * @memberof KSSPlay
     * @param {KSSPlay~IOWriteHandler} callback
     */
    setIOWriteHandler(callback) {
      if (this._iowrite_handler) {
        getModule().removeFunction(this._iowrite_handler);
      }

      this._iowrite_handler = getModule().addFunction((_, a, d) => callback(this, a, d), "viii");

      getModule().ccall(
        "KSSPLAY_set_iowrite_handler",
        null,
        ["number", "number", "number"],
        [this._kssplay, 0, this._iowrite_handler]
      );
    }
    
    /**
     * @callback KSSPlay~MemWriteHandler
     * @param {KSSPlay} context
     * @param {number} adr
     * @param {number} data
     */

    /**
     * Set memory write handler
     * @method
     * @memberof KSSPlay
     * @param {KSSPlay~MemWriteHandler} callback
     */
    setMemWriteHandler(callback) {
      if (this._memwrite_handler) {
        getModule().removeFunction(this._memwrite_handler);
      }
      this._memwrite_handler = getModule().addFunction((_, a, d) => callback(this, a, d), "viii");
      getModule().ccall(
        "KSSPLAY_set_memwrite_handler",
        null,
        ["number", "number", "number"],
        [this._kssplay, 0, this._memwrite_handler]
      );
    }
    writeIO(a, d) {
      getModule().ccall("KSSPLAY_write_io", null, ["number", "number", "number"], [this._kssplay, a, d]);
    }
    writeMemory(a, d) {
      getModule().ccall("KSSPLAY_write_io", null, ["number", "number", "number"], [this._kssplay, a, d]);
    }
    /**
     * Get MGSDRV's MIB.JUMPCT
     * @method
     * @memberof KSSPlay
     * @returns value of MIB.JUMPCT
     */
    getMGSJumpCount() {
      return getModule().ccall("KSSPLAY_get_MGS_jump_count", null, ["number"], [this._kssplay]);
    }
    /**
     * Delegate of the malloc function on the emscripten heap.
     * @static
     * @memberof KSSPlay
     * @param {number} [size]
     * @returns {number} The pointer to the allocated buffer.
     */
    static _malloc(size) {
      return getModule()._malloc(size);
    }
    /**
     * Delegate of the free function on the emscripten heap.
     * @static
     * @memberof KSSPlay
     * @param {number} [ptr] The pointer to the allocated buffer.
     */
    static _free(ptr) {
      getModule()._free(ptr);
    }
    /**
     * Make Int16Array from the pointer of the allocated memory on emuscripten heap.
     * @static
     * @memberof KSSPlay
     * @param {number} [ptr] The pointer to the allocated buffer.
     * @param {number} [size] The size of Int16Array.
     * @returns {Int16Array}
     */
    static toInt16Array(ptr, size) {
      return new Int16Array(getModule().HEAPU8.buffer, ptr, size);
    }
  }

  if (typeof exports === "object") {
    module.exports = KSSPlay;
  } else if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define(function () {
      return KSSPlay;
    });
  }
})();
