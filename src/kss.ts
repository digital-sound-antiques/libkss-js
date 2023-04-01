import { getModule } from "./module.js";
import encoding from "encoding-japanese";
import sha1 from "sha1";
import { Buffer } from 'buffer';

/**
 * @param progress - progress (time in ms).
 * @param total - total (time in ms) that is similar to the given duration option parameter for toVGMAsync().
 * @returns Non-zero to abort the process. Otherwise the process will be continued.
 */
export type VGMProgressCallback = (progress: number, duration: number) => number;

/**
 * VGM export options
 * @param duration - duration in ms.
 * @param song - sub song number.
 * @param loop - maximum loop number.
 * @param volume - volume offset.
 * @param callback - callback for progress.
 */
export type VGMOptions = {
  duration?: number | null;
  song?: number | null;
  loop?: number | null;
  volume?: number | null;
  callback?: VGMProgressCallback | null;
};

export class KSS {
  obj: any;
  song: number;
  data: Uint8Array;
  hash: string = "";
  hasMultiSongs: boolean = false;

  static hashMap: { [key: string]: KSS } = {};

  /**
   * Create a new KSS object.
   * @param data - the KSS file binary.
   * @param filename - the name of the KSS file (used only for determine file type).
   * @param song - internal song index. (0 to 255)
   */
  constructor(data: Uint8Array, filename: string, song: number = 0) {
    if (256 * 65536 < data.length) {
      throw new Error("Wrong data format.");
    }

    const buf = getModule()._malloc(data.length);
    getModule().HEAPU8.set(data, buf);
    this.obj = getModule().ccall(
      "KSS_bin2kss",
      "number",
      ["number", "number", "string"],
      [buf, data.length, filename]
    );
    if (this.obj == 0) {
      throw new Error("Can't create KSS object.");
    }
    this.song = song;
    this.data = data;
    getModule()._free(buf);
  }

  /**
   * get title string of the KSS file.
   * This function assumes the title string of KSS is simple ASCII or SJIS encoded.
   *
   * @returns The title string if exists.
   */
  getTitle(): string {
    const ptr = getModule().ccall("KSS_get_title", "number", ["number"], [this.obj]);
    let i = 0;
    for (i = 0; i < 256; i++) {
      if (getModule().HEAPU8[ptr + i] == 0) break;
    }
    return encoding.convert(new Uint8Array(getModule().HEAPU8.buffer, ptr, i), {
      type: "string",
      to: "UNICODE",
      from: "SJIS",
    });
  }

  /**
   * Release the object. Without calling this method will cause memory-leak.
   */
  release() {
    if (this.obj) {
      getModule().ccall("KSS_delete", null, ["number"], [this.obj]);
      this.obj = null;
      delete KSS.hashMap[this.hash];
    } else {
      throw new Error("KSS double-release: " + this.hash);
    }
  }

  /**
   * Destory all the cached KSS instances that generated from this library.
   */
  static releaseAll() {
    for (const key in KSS.hashMap) {
      KSS.hashMap[key].release();
    }
  }

  /**
   * Create a unique KSS object. If the same data is given, this function returns the same KSS instance.
   * @param data - the KSS file binary.
   * @param filename - the name of the KSS file.
   * @param song=0 - internal song index.
   * @returns A KSS instance.
   */
  static createUniqueInstance(data: Uint8Array, filename: string, song: number = 0) {
    const buffer = Buffer.from(data.buffer, data.byteOffset, data.length);
    const hashHex = `sha1:${sha1(buffer)}:${song}`;
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
   * Convert KSS to VGM (non-blocking)
   *
   * @param options - VGM export options.
   * @param callback - callback for progress
   * @returns Promise for VGM data or null if the conversion process is aborted.
   */
  async toVGMAsync(options: VGMOptions): Promise<Uint8Array | null> {
    const { duration, song, loop, volume, callback } = _buildPlayOptions(options);
    const kss2vgm = getModule().ccall("KSS2VGM_new", "number", [], []);

    getModule().ccall(
      "KSS2VGM_setup",
      null,
      ["number", "number", "number", "number", "number", "number"],
      [kss2vgm, this.obj, duration, song, loop, volume]
    );

    let result: number = 0;
    let progress = 0,
      completed = 0;
    while (completed == 0) {
      completed = getModule().ccall("KSS2VGM_process", "number", ["number"], [kss2vgm]);
      progress += 1000;
      if (callback != null) {
        if (callback(progress, duration)) {
          break;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    let vgm: Uint8Array | null = null;

    if (completed) {
      result = getModule().ccall("KSS2VGM_get_result", "number", ["number"], [kss2vgm]);
      vgm = _buildVGMResult(result);
    }

    getModule().ccall("KSS2VGM_delete", null, ["number"], [kss2vgm]);

    if (result) {
      getModule().ccall("KSS2VGM_Result_delete", null, ["number"], [result]);
    }

    return vgm;
  }

  /**
   * Convert KSS to VGM (blocking)
   *
   * @param options
   * @returns VGM data.
   */
  toVGM(options: VGMOptions): Uint8Array {
    const { duration, song, loop, volume } = _buildPlayOptions(options);
    const kss2vgm = getModule().ccall("KSS2VGM_new", "number", [], []);

    const result = getModule().ccall(
      "KSS2VGM_kss2vgm",
      "number",
      ["number", "number", "number", "number", "number", "number"],
      [kss2vgm, this.obj, duration, song, loop, volume]
    );

    const vgm = _buildVGMResult(result);

    getModule().ccall("KSS2VGM_delete", null, ["number"], [kss2vgm]);
    getModule().ccall("KSS2VGM_Result_delete", null, ["number"], [result]);

    return vgm;
  }
}

function _buildVGMResult(resultPtr: number): Uint8Array {
  if (resultPtr != 0) {
    const vgmPtr = getModule().ccall("KSS2VGM_Result_vgm_ptr", "number", ["number"], [resultPtr]);
    const vgmSize = getModule().ccall("KSS2VGM_Result_vgm_size", "number", ["number"], [resultPtr]);
    return new Uint8Array(getModule().HEAPU8.buffer, vgmPtr, vgmSize).slice();
  }
  throw new Error("Failed to build VGM");
}

function _buildPlayOptions(options: VGMOptions = {}) {
  return {
    duration: options.duration ?? 300 * 1000,
    song: options.song ?? 0,
    loop: options.loop ?? 2,
    volume: options.volume ?? 0,
    callback: options.callback,
  };
}
