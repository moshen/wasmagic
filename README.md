# WASMagic

## About

A WebAssembly compiled version of [libmagic](https://www.darwinsys.com/file/)
with a simple API for Node. WASMagic provides accurate filetype detection with
zero prod dependencies.

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

Building requires the [Emscripten](https://emscripten.org/) sdk, autoconf,
automake, and libtool.

---

The easiest way to build is to use the bundled Docker builder image based on the
official [Emscripten](https://hub.docker.com/r/emscripten/emsdk) image. Simply
run:

```bash
make docker-builder-run test
```

---

If you would like to build natively on your Mac, and have
[Homebrew](https://brew.sh/) installed, install these additional packages:

```bash
brew install autoconf automake coreutils emscripten libtool
```

Then:

```bash
make
```

Will build and test the module.
