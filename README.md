# WASMagic

## About

A WebAssembly compiled version of [libmagic](https://www.darwinsys.com/file/)
with an extremely simple API for Node. libmagic provides extremely accurate
filetype detection.

## Usage

```bash
npm install wasmagic
```

```javascript
const fs = require("fs");
const { WASMagic } = require("wasmagic");
const magic = await WASMagic.create();
console.log(magic.getMime(fs.readFileSync("somefile")));
```

## Development

Install Node and dependencies:

```bash
nvm install && nvm use
npm ci
```

---

Building requires [Emscripten](https://emscripten.org/) and autotools to be
installed locally:

To setup for Mac:

```bash
brew install emscripten autotools
```

Then:

```bash
make
```

Will build and test the module.

---

If you want to use a Docker version of
[Emscripten](https://hub.docker.com/r/emscripten/emsdk), run:

```bash
make docker-builder-run test
```
