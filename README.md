# Install
```
npm install --save-dev libkss
```

# Usage
```
var KSS = require('libkss').KSS;
var KSSPlay = require('libkss').KSSPlay;

var kssplay = new KSSPlay(44100);
var kss = KSS.loadFromUrl('http://http://digital-sound-antiques.github.io/msxplay-js/demo/grider.mgs');

kssplay.setData(kss);
kssplay.reset();

var waves = kssplay.calc(44100); // returns Int16Array of wave samples.

// do something

kssplay.release();
kss.release();
```

# How to Build
node.js, `emcmake` and `cmake` with some proper C compiler is required.

```
git clone https://github.com/digital-sound-antiques/libkss-js.git
cd libkss-js
npm install
npm run build
```

