import moduleFactory from '../lib/libkss.js';

interface LibkssModule extends EmscriptenModule {
  ccall: typeof ccall;
  cwrap: typeof cwrap;
  addFunction: typeof addFunction;
  removeFunction: typeof removeFunction;
}

let _module: LibkssModule | null;

export async function initModule(): Promise<void> {
  _module = await moduleFactory() as LibkssModule;
}

export function getModule(): LibkssModule {
  if (_module == null) {
    throw new Error("libkss module is not initialized.");
  }
  return _module;
}
