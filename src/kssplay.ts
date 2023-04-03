import { initModule, getModule } from "./module.js";
import { KSS } from "./kss.js";

type DeviceName = "psg" | "scc" | "opll" | "opl";

function deviceNameToId(name: DeviceName): number {
  if (name === "psg") {
    return 0;
  }
  if (name === "scc") {
    return 1;
  }
  if (name == "opll") {
    return 2;
  }
  if (name == "opl") {
    return 3;
  }
  return -1;
}

export type ObjectPtr = number;

/**
 * I/O write handler
 * @param context - current context
 * @param adr - address
 * @param data - data
 */
export type IOWriteHandler = (context: KSSPlay, adr: number, data: number) => void;

/**
 * Memory write handler
 * @param context - current context
 * @param adr - address
 * @param data - data
 */
export type MemWriteHandler = (context: KSSPlay, adr: number, data: number) => void;

/**
 * Params for setDeviceQuality
 * @param psg - PSG quality. 0:normal, 1:high
 * @param scc - SCC quality. 0:normal, 1:high
 * @param opll - OPLL quality. 0:normal, 1:high
 * @param opl - OPL quality. 0:normal, 1:high
 */
export type DeviceQualityParams = { psg?: number; scc?: number; opll?: number; opl?: number };

export class KSSPlay {
  /**
   * Initialize library. Must be called with await before using KSS and KSSPlay classes.
   * @returns a Promise<void> object.
   */
  static initialize() {
    return initModule();
  }

  _kssplay: ObjectPtr = 0;
  _buffer: ObjectPtr = 0;
  _bufferSize: number = 0;
  _song = 0;

  _memwrite_handler: ObjectPtr = 0;
  _iowrite_handler: ObjectPtr = 0;
  _regsBuf: ObjectPtr = 0;

  /**
   * Create a new KSS player instance.
   * @param rate - playback sample rate.
   */
  constructor(rate: number = 44100) {
    this._regsBuf = getModule()._malloc(256);
    this._kssplay = getModule().ccall(
      "KSSPLAY_new",
      "number",
      ["number", "number", "number"],
      [rate, 1, 16]
    );
  }

  /**
   * Specify the playback quality of the devices.
   * @param params
   */
  setDeviceQuality(params: DeviceQualityParams = {}) {
    const names: Array<DeviceName> = ["psg", "scc", "opll", "opl"];
    for (const key of names) {
      const devId = deviceNameToId(key);
      const quality = params[key] ?? 0;
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
   * @param kss - kss instance.
   */
  setData(kss: KSS) {
    this._song = kss.song;
    getModule().ccall("KSSPLAY_set_data", null, ["number", "number"], [this._kssplay, kss.obj]);
  }
  /**
   * Resets the player.
   * @param song - The song number to play. If null, song index stored in KSS object is used.
   * @param cpuSpeed - 0:AUTO, 1:3.58MHz 2:5.38MHz 3:7.16MHz 4:14.32MHz 5:28.64MHz
   */
  reset(song: number | null, cpuSpeed: number = 0) {
    getModule().ccall(
      "KSSPLAY_reset",
      null,
      ["number", "number", "number"],
      [this._kssplay, song || this._song, cpuSpeed]
    );
  }

  _ensureBufferSize(size: number) {
    if (this._buffer && this._bufferSize < size) {
      getModule()._free(this._buffer);
      this._buffer = 0;
      this._bufferSize = 0;
    }
    if (this._buffer == 0) {
      this._buffer = getModule()._malloc(size);
      this._bufferSize = size;
    }
  }
  /**
   * Calculate specified length of wave samples.
   * @param samples - The number of samples to render.
   * @returns generated samples.
   */
  calc(samples: number): Int16Array {
    this._ensureBufferSize(samples * 2);
    this.calcToBuffer(this._buffer, samples);
    return new Int16Array(getModule().HEAPU8.buffer, this._buffer, samples).slice();
  }
  /**
   * @param buffer - pointer to the sample buffer.
   * @param samples - number of samples to render.
   */
  calcToBuffer(buffer: ObjectPtr, samples: number) {
    getModule().ccall(
      "KSSPLAY_calc",
      null,
      ["number", "number", "number"],
      [this._kssplay, buffer, samples]
    );
  }
  /**
   * Calculate specified length without rendering wave.
   * @param samples - number of samples to calculate.
   */
  calcSilent(samples: number) {
    getModule().ccall("KSSPLAY_calc_silent", null, ["number", "number"], [this._kssplay, samples]);
  }
  /**
   * Get the number of loops of the current playing music.
   * @returns current loop counts.
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
   * @param time - maximum silent span in millis.
   */
  setSilentLimit(time: number) {
    getModule().ccall(
      "KSSPLAY_set_silent_limit",
      null,
      ["number", "number"],
      [this._kssplay, time]
    );
  }
  /**
   * Starts the fade-out.
   * @param duration - fade-out duration in millis.
   */
  fadeStart(duration: number) {
    getModule().ccall("KSSPLAY_fade_start", null, ["number", "number"], [this._kssplay, duration]);
  }
  /**
   * Check the player is stopped or not.
   * @returns 0: not stopped, 1: stopped.
   */
  getStopFlag() {
    return getModule().ccall("KSSPLAY_get_stop_flag", "number", ["number"], [this._kssplay]);
  }
  /**
   * Set RC low-pass filter params.
   * @param r - Registor (OM)
   * @param c - Capacitor (nF)
   */
  setRCF(r: number, c: number) {
    return getModule().ccall(
      "KSSPLAY_set_rcf",
      null,
      ["number", "number", "number"],
      [this._kssplay, r, c]
    );
  }

  /**
   * Release the object. Without calling this method will cause memory-leak.
   */
  release() {
    getModule().ccall("KSSPLAY_delete", null, ["number"], [this._kssplay]);
    if (this._memwrite_handler) {
      getModule().removeFunction(this._memwrite_handler);
      this._memwrite_handler = 0;
    }
    if (this._iowrite_handler) {
      getModule().removeFunction(this._iowrite_handler);
      this._iowrite_handler = 0;
    }
    this._kssplay = 0;
    if (this._buffer) {
      getModule()._free(this._buffer);
      this._buffer = 0;
    }
    if (this._regsBuf) {
      getModule()._free(this._regsBuf);
      this._regsBuf = 0;
    }
  }

  /**
   * Install callback for I/O write access on the VM.
   * @param handler
   */
  setIOWriteHandler(handler: IOWriteHandler): void {
    if (this._iowrite_handler) {
      getModule().removeFunction(this._iowrite_handler);
    }

    this._iowrite_handler = getModule().addFunction((_, a, d) => handler(this, a, d), "viii");

    getModule().ccall(
      "KSSPLAY_set_iowrite_handler",
      null,
      ["number", "number", "number"],
      [this._kssplay, 0, this._iowrite_handler]
    );
  }

  /**
   * Install callback for memory write access on the VM.
   * @param handler
   */
  setMemWriteHandler(handler: MemWriteHandler): void {
    if (this._memwrite_handler) {
      getModule().removeFunction(this._memwrite_handler);
    }
    this._memwrite_handler = getModule().addFunction((_, a, d) => handler(this, a, d), "viii");
    getModule().ccall(
      "KSSPLAY_set_memwrite_handler",
      null,
      ["number", "number", "number"],
      [this._kssplay, 0, this._memwrite_handler]
    );
  }

  /**
   * Write data to VM's I/O port.
   * @param a - address
   * @param d - data
   */
  writeIO(a: number, d: number): void {
    getModule().ccall(
      "KSSPLAY_write_io",
      null,
      ["number", "number", "number"],
      [this._kssplay, a, d]
    );
  }

  /**
   * Write data to VM's memory.
   * @param a - address
   * @param d - data
   */
  writeMemory(a: number, d: number): void {
    getModule().ccall(
      "KSSPLAY_write_io",
      null,
      ["number", "number", "number"],
      [this._kssplay, a, d]
    );
  }

  /**
   * MGSDRV's MIB.JUMPCT
   * @returns value of MIB.JUMPCT
   */
  getMGSJumpCount(): number {
    return getModule().ccall("KSSPLAY_get_MGS_jump_count", "number", ["number"], [this._kssplay]);
  }

  /**
   * Read device's register array snapshot.
   * @param device 
   * @returns Device's register array snapshot.
   */
  readDeviceRegs(device: DeviceName): Uint8Array {
    const id = deviceNameToId(device);
    const size = getModule().ccall(
      "KSSPLAY_read_device_regs",
      "number",
      ["number", "number", "number"],
      [this._kssplay, id, this._regsBuf]
    );
    return getModule().HEAPU8.subarray(this._regsBuf, this._regsBuf + size).slice();
  }

  /**
   * Delegate of the malloc function on the emscripten heap.
   * @param size - memory size to request.
   * @returns pointer to the allocated buffer.
   */
  static _malloc(size: number): ObjectPtr {
    return getModule()._malloc(size);
  }

  /**
   * Delegate of the free function on the emscripten heap.
   * @param ptr - pointer to the allocated buffer.
   */
  static _free(ptr: ObjectPtr) {
    getModule()._free(ptr);
  }

  /**
   * Make Int16Array from the pointer of the allocated memory on the emscripten heap.
   * @param ptr - pointer to the allocated buffer.
   * @param size - buffer size
   * @returns Int16Array that contains allocated memory.
   */
  static toInt16Array(ptr: ObjectPtr, size: number): Int16Array {
    return new Int16Array(getModule().HEAPU8.buffer, ptr, size);
  }
}
