(function() {
  "use strict";

  var Module = require("./module");

  /**
   * Create a new KSS player instance.
   * @name KSSPlay
   * @constructor
   * @param {number} [rate=44100] - The audio playback rate.
   */
  var KSSPlay = function(rate) {
    this._kssplay = Module.ccall("KSSPLAY_new", "number", ["number", "number", "number"], [rate || 44100, 1, 16]);
    this._buffer = null;
    this._song = 0;
  };

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

  KSSPlay._emscriptenModule = Module;

  /**
   * Delegate of the malloc function on the emscripten heap.
   * @static
   * @memberof KSSPlay
   * @param {number} [size]
   * @returns {number} The pointer to the allocated buffer.
   */
  KSSPlay._malloc = function(size) {
    return Module._malloc(size);
  };

  /**
   * Delegate of the free function on the emscripten heap.
   * @static
   * @memberof KSSPlay
   * @param {number} [ptr] The pointer to the allocated buffer.
   */
  KSSPlay._free = function(ptr) {
    Module._free(ptr);
  };

  /**
   * Make Int16Array from the pointer of the allocated memory on emuscripten heap.
   * @static
   * @memberof KSSPlay
   * @param {number} [ptr] The pointer to the allocated buffer.
   * @param {number} [size] The size of Int16Array.
   * @returns {Int16Array}
   */
  KSSPlay.toInt16Array = function(ptr, size) {
    return new Int16Array(Module.HEAPU8.buffer, ptr, size);
  };

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
  KSSPlay.prototype.setDeviceQuality = function(config) {
    config = config || {};
    for (var key in config) {
      var devId = deviceNameToId(key);
      var quality = config[key];
      if (0 <= devId) {
        Module.ccall(
          "KSSPLAY_set_device_quality",
          null,
          ["number", "number", "number"],
          [this._kssplay, devId, quality]
        );
      }
    }
  };

  /**
   * Set the kss object for playing.
   * @method
   * @memberof KSSPlay
   * @param {KSS} kss - kss instance.
   */
  KSSPlay.prototype.setData = function(kss) {
    this._song = kss.song;
    Module.ccall("KSSPLAY_set_data", null, ["number", "number"], [this._kssplay, kss.obj]);
  };

  /**
   * Resets the player.
   * @method
   * @memberof KSSPlay
   * @param {number} [song=0|null] The song number to play. If null, song index stored in KSS object is used.
   * @param {number} [cpuSpeed=0] 0:auto, <=1: cpu speed factor.
   */

  KSSPlay.prototype.reset = function(song, cpuSpeed) {
    Module.ccall(
      "KSSPLAY_reset",
      null,
      ["number", "number", "number"],
      [this._kssplay, song || this._song, cpuSpeed || 0]
    );
  };

  KSSPlay.prototype._ensureBufferSize = function(size) {
    if (this._buffer != null && this._buffer.length < size) {
      Module._free(this._buffer);
      this._buffer = null;
    }
    if (this._buffer == null) {
      this._buffer = Module._malloc(size);
    }
  };

  /**
   * Calculate specified length of wave samples.
   * @method
   * @memberof KSSPlay
   * @param {number} samples The number of samples to render.
   * @returns {Int16Array} The generated samples.
   */
  KSSPlay.prototype.calc = function(samples) {
    this._ensureBufferSize(samples * 2);
    this.calcToBuffer(this._buffer, samples);
    return new Int16Array(Module.HEAPU8.buffer, this._buffer, samples).slice();
  };

  /**
   * @method
   * @memberof KSSPlay
   * @param {number} buffer The pointer to the sample buffer.
   * @param {number} samples The number of samples to render.
   */
  KSSPlay.prototype.calcToBuffer = function(buffer, samples) {
    Module.ccall("KSSPLAY_calc", null, ["number", "number", "number"], [this._kssplay, buffer, samples]);
  };

  /**
   * Calculate specified length without rendering wave.
   * @method
   * @memberof KSSPlay
   * @param {number} samples The number of samples to calculate.
   */
  KSSPlay.prototype.calcSilent = function(samples) {
    Module.ccall("KSSPLAY_calc_silent", null, ["number", "number"], [this._kssplay, samples]);
  };

  /**
   * Get the number of loops of the current playing music.
   * @method
   * @memberof KSSPlay
   * @returns The number of the current loop counts.
   */
  KSSPlay.prototype.getLoopCount = function() {
    return Module.ccall("KSSPLAY_get_loop_count", "number", ["number"], [this._kssplay]);
  };

  /**
   * Get progress of the fading-out.
   * @returns 0: Not started, 1: In progress, 3: Completed.
   */
  KSSPlay.prototype.getFadeFlag = function() {
    return Module.ccall("KSSPLAY_get_fade_flag", "number", ["number"], [this._kssplay]);
  };

  /**
   * Set the limit of the slient length. The player automatically stops if it detects silent longer than this limit.
   * @method
   * @memberof KSSPlay
   * @param {number} time maximum silent span in millis.
   */
  KSSPlay.prototype.setSilentLimit = function(time) {
    Module.ccall("KSSPLAY_set_silent_limit", null, ["number", "number"], [this._kssplay, time]);
  };

  /**
   * Starts the fade-out.
   * @method
   * @memberof KSSPlay
   * @param {number} duration fade-out duration in millis.
   */
  KSSPlay.prototype.fadeStart = function(duration) {
    Module.ccall("KSSPLAY_fade_start", null, ["number", "number"], [this._kssplay, duration]);
  };

  /**
   * Check the player is stopped or not.
   * @method
   * @memberof KSSPlay
   * @returns 0: not stopped, 1: stopped.
   */
  KSSPlay.prototype.getStopFlag = function() {
    return Module.ccall("KSSPLAY_get_stop_flag", "number", ["number"], [this._kssplay]);
  };

  /**
   * Set RC low-pass filter params.
   * @method
   * @memberof KSSPlay
   * @param {number} r - Registor (OM)
   * @param {number} c - Capacitor (nF)
   */
  KSSPlay.prototype.setRCF = function(r, c) {
    return Module.ccall("KSSPLAY_set_rcf", null, ["number", "number"], [this._kssplay, r, c]);
  };

  /**
   * Release the object. Without calling this method will cause memory-leak.
   * @method
   * @memberof KSSPlay
   */
  KSSPlay.prototype.release = function() {
    Module.ccall("KSSPLAY_delete", null, ["number"], [this._kssplay]);
    if (this._memwrite_handler) {
      Module.removeFunction(this._memwrite_handler);
      this._memwrite_handler = null;
    }
    if (this._iowrite_handler) {
      Module.removeFunction(this._iowrite_handler);
      this._iowrite_handler = null;
    }
    this._kssplay = null;
    if (this._buffer != null) {
      Module._free(this._buffer);
      this._buffer = null;
    }
  };

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
  KSSPlay.prototype.setIOWriteHandler = function(callback) {
    if (this._iowrite_handler) {
      Module.removeFunction(this._iowrite_handler);
    }

    this._iowrite_handler = Module.addFunction((_, a, d) => callback(this, a, d), "viii");

    Module.ccall(
      "KSSPLAY_set_iowrite_handler",
      null,
      ["number", "number", "number"],
      [this._kssplay, 0, this._iowrite_handler]
    );
  };

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
  KSSPlay.prototype.setMemWriteHandler = function(callback) {
    if (this._memwrite_handler) {
      Module.removeFunction(this._memwrite_handler);
    }
    this._memwrite_handler = Module.addFunction((_, a, d) => callback(this, a, d), "viii");
    Module.ccall(
      "KSSPLAY_set_memwrite_handler",
      null,
      ["number", "number", "number"],
      [this._kssplay, 0, this._memwrite_handler]
    );
  };

  KSSPlay.prototype.writeIO = function(a, d) {
    Module.ccall("KSSPLAY_write_io", null, ["number", "number", "number"], [this._kssplay, a, d]);
  };

  KSSPlay.prototype.writeMemory = function(a, d) {
    Module.ccall("KSSPLAY_write_io", null, ["number", "number", "number"], [this._kssplay, a, d]);
  };

  if (typeof exports === "object") {
    module.exports = KSSPlay;
  } else if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define(function() {
      return KSSPlay;
    });
  }
})();
