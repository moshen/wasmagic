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
const { WASMagic } = require("wasmagic");

async function main() {
  const magic = await WASMagic.create();
  const pngFile = Buffer.from("89504E470D0A1A0A0000000D49484452", "hex");
  console.log(magic.getMime(pngFile));
}

main().catch((err) => console.error(err));
// outputs: image/png
```

### Examples

- [Async / Worker threads](examples/worker/)

### Performance considerations

WASMagic will copy the entire provided buffer into the wasm heap for processing.
This can cause significant performance penalties if the files being processed
are exceptionally large (ex. video files, image files).

To ensure that your application remains performant, either load only the head
of the file you want to detect, or slice the head off of a file buffer:

```javascript
const { WASMagic } = require("wasmagic");
const fs = require("fs");

async function main() {
  const magic = await WASMagic.create();
  const largeFile = fs.readFileSync("largeFile.mp4");
  console.log(magic.getMime(largeFile.slice(0, 1024)));
}

main().catch((err) => console.error(err));
// outputs: video/mp4
```

However, this strategy falls apart depending on the type of file that you are
trying to detect and the accuracy you are looking for. For example; pre 2007
Microsoft Office documents will only be accurately detected if the entire file
is available to be parsed. If you use the above strategy to check the head of
the file, you will get `application/CDFV2` instead of `application/msword`.

To make sure you're getting accurate results for the files that you're trying
to detect, be sure to test example files.

### Detected filetypes

WASMagic detects any file type [detected by
libmagic](https://github.com/file/file/tree/master/magic/Magdir), which is over
1500 mime types. For comparison; the
[file-type](https://www.npmjs.com/package/file-type) library supports 138 types.

Specifically, WASMagic will accurately detect all types of Microsoft Office
files, as well as many plain text file formats where file-type does not.

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
