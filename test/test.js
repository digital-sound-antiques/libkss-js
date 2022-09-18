const { KSS, KSSPlay } = require('../src/index');
const { WaveFile } = require('wavefile');
const fs = require('fs');
const fetch = require('node-fetch');

async function loadKSSFromUrl(url) {
  const res = await fetch(url);
  const ab = await res.arrayBuffer();
  return KSS.createUniqueInstance(new Uint8Array(ab), url);
}

async function main() {
  await KSSPlay.initialize(); // must be called before using KSSPlay and KSS objects.

  const RATE = 44100;

  const kssplay = new KSSPlay(RATE);
  const kss = await loadKSSFromUrl('https://digital-sound-antiques.github.io/msxplay-js/demo/grider.mgs');

  // toVGM
  // const vgm = kss.toVGM({ duration: 30 * 1000 });
  const vgm = await kss.toVGMAsync({ 
    duration: 300 * 1000, 
    callback: (progress, total) => { 
      console.log(`${progress}/${total}`); 
    } 
  });

  fs.writeFileSync('test.vgm', vgm);

  // toWAV
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