# libkss-js [![npm version](https://badge.fury.io/js/libkss-js.svg)](https://badge.fury.io/js/libkss-js)
<img src="https://nodei.co/npm/libkss-js.png?downloads=true&stars=true" alt=""/>

# Breaking Changes on 1.3.0
- `KSSPlay.initialize()` must be called with await before using KSSPlay.
- Change `KSS.loadFromUrl(url)` to return `Promise<KSS>` instead of callback.

# Install
```
npm install --save libkss-js
```

# Usage
```
const { KSS, KSSPlay } = require('libkss-js');
const { WaveFile } = require('wavefile');
const fs = require('fs');

async function main() {
  await KSSPlay.initialize(); // must be called before using KSSPlay.

  const RATE = 44100;

  const kssplay = new KSSPlay(RATE);
  const kss = await KSS.loadFromUrl('https://digital-sound-antiques.github.io/msxplay-js/demo/grider.mgs');

  kssplay.setData(kss);
  kssplay.reset();

  const samples = kssplay.calc(RATE * 30); // Generate 30 seconds
  const wav = new WaveFile();
  wav.fromScratch(1, RATE, '16', samples);
  fs.writeFileSync('test.wav', wav.toBuffer());

  kssplay.release();
  kss.release();
}

main();
```

# How to Build
To build libkss.js, Emscripten 1.39.0 or greater is required. The latest tested version is 2.0.13.
`emcmake` and `cmake` with some proper C compiler is required before npm install.

```
git clone --recursive https://github.com/digital-sound-antiques/libkss-js.git
cd libkss-js
npm install
npm run build
```

# API Document
https://digital-sound-antiques.github.io/libkss-js/
