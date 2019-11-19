declare module "libkss-js" {
  class KSS {
    constructor(data: Uint8Array, name: string);
    releaseAll(): void;
    createUniqueInstance(data: Uint8Array, name: string): KSS;
    loadFromUrl(url: string, cb: (err: any, url: string) => void): void;
    getTitle(): string;
    release(): void;
  }

  class KSSPlay {
    constructor(rate: number);
    _malloc(size: number): number;
    _free(size: number): void;
    toInt16Array(ptr: number, size: number): Int16Array;
    setDeviceQuality(config: { psg: number; scc: number; opll: number; opl: number }): void;
    setData(kss: KSS): void;
    reset(song?: number, cpuSpeed?: number): void;
    calc(samples: number): Int16Array;
    calcSilent(samples: number): void;
    getLoopCount(): number;
    getFadeFlag(): number;
    setSilentLimit(): number;
    fadeStart(): void;
    getStopFlag(): number;
    setRCF(r: number, c: number): void;
    release(): void;
    setIOWriteHandler(cb: (context: KSSPlay, a: number, d: number) => void): void;
    setMemWriteHandler(cb: (context: KSSPlay, a: number, d: number) => void): void;
  }
}
