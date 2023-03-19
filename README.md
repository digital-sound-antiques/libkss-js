# libkss-js [![npm version](https://badge.fury.io/js/libkss-js.svg)](https://badge.fury.io/js/libkss-js)
<img src="https://nodei.co/npm/libkss-js.png?downloads=true&stars=true" alt=""/>

## Breaking Changes on 2.0.0
The module format of the package has chnaged to ES6 module from CommonJS.

## Breaking Changes on 1.4.0
`KSS.loadFromUrl(url)` is removed in order to eliminate dependence on `fetch` API. 
Use the following code instead if required.

```
async function loadKSSFromUrl(url) {
  const res = await fetch(url);
  const ab = await res.arrayBuffer();
  return KSS.createUniqueInstance(new Uint8Array(ab), url);
}
```

## Breaking Changes on 1.3.0
`KSSPlay.initialize()` must be called with await before using KSSPlay.

## Install
```
npm install --save libkss-js
```

## Usage
```
const { KSS, KSSPlay } = require('libkss-js');
const { WaveFile } = require('wavefile');
const fs = require('fs');

async function loadKSSFromUrl(url) {
  const res = await fetch(url);
  const ab = await res.arrayBuffer();
  return KSS.createUniqueInstance(new Uint8Array(ab), url);
}

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

## How to Build
To build libkss.js, Emscripten 2.0.0 or greater is required. The latest tested version is 3.1.21.
`emcmake` and `cmake` with some proper C compiler is required before npm install.

```
git clone --recursive https://github.com/digital-sound-antiques/libkss-js.git
cd libkss-js
npm install
npm run build
```

## API Document
https://digital-sound-antiques.github.io/libkss-js/api/
