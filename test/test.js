const { KSS, KSSPlay } = require('../src/index');
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