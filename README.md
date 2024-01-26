# WASMagic

[![NPM](https://img.shields.io/npm/v/wasmagic)](https://www.npmjs.com/package/wasmagic)
[![Build status](https://img.shields.io/github/actions/workflow/status/moshen/wasmagic/ci.yml?branch=master)](https://github.com/moshen/wasmagic/actions/workflows/ci.yml)

## About

A [WebAssembly](https://webassembly.org/) compiled version of
[libmagic](https://www.darwinsys.com/file/) with a simple API for Node. WASMagic
provides accurate filetype detection with zero prod dependencies.

## Usage

[Install `wasmagic` from npm](https://www.npmjs.com/package/wasmagic):

```bash
npm install wasmagic
```

Detect the mime and encoding of something:

```javascript
const { WASMagic, WASMagicFlags } = require("wasmagic");

async function main() {
  const magic = await WASMagic.create(
    WASMagicFlags.MIME_TYPE | WASMagicFlags.MIME_ENCODING,
  );
  const pngFile = Buffer.from("89504E470D0A1A0A0000000D49484452", "hex");
  console.log(magic.getMime(pngFile));
}

main().catch((err) => console.error(err));
// outputs: image/png; charset=binary
```

### Examples

- [Async / Worker threads](examples/worker/)
- [Stream mime type detection](examples/stream-detection/)

### Performance considerations

#### WASMagic instantiation

You should instantiate as few copies of `WASMagic` as you can get away with for
your usecase. Each instantiation loads the magic database, which is around 8MB.
One instance per process / worker thread should be enough as the main api
(`WASMagic.getMime`) is synchronous.

If you want to offload processing to another thread, take a look at the [Async /
Worker threads](examples/worker/) example.

If you aren't passing your instantiated dependencies down in your application,
and are trying to use this as a global, try something like the following:

```javascript
const { WASMagic } = require("wasmagic");
let magicGlobal = null;
const magicPromise = WASMagic.create().then((instance) => {
  magicGlobal = instance;
  return magicGlobal;
});

async function main() {
  const magic = magicGlobal || (await magicPromise);
  const pngFile = Buffer.from("89504E470D0A1A0A0000000D49484452", "hex");
  console.log(magic.getMime(pngFile));
}

main().catch((err) => console.error(err));
// outputs: image/png
```

#### Large files

WASMagic will copy the entire provided buffer into the wasm heap for processing.
This can cause significant performance penalties if the files being processed
are exceptionally large (ex. video files, image files).

To ensure that your application remains performant, either load only the head
of the file you want to detect, or slice the head off of a file buffer:

```javascript
const { WASMagic } = require("wasmagic");
const fs = require("fs/promises");

async function main() {
  const magic = await WASMagic.create();
  const file = await fs.open("largeFile.mp4");
  // Only read the first 1024 bytes of our large file
  const { bytesRead, buffer } = await file.read({ buffer: Buffer.alloc(1024) });
  // We're assuming that largeFile.mp4 is >= 1024 bytes in size and our buffer
  // will only have the first 1024 bytes of largeFile.mp4 in it
  console.log(magic.getMime(buffer));
  await file.close();
}

main().catch((err) => console.error(err));
// outputs: video/mp4
```

Alternatively, if you are streaming a large file, look at the [stream mime type
detection example](examples/stream-detection/). When you're dealing with
streams you can attempt detection of the mime type when the first chunks are
loaded.

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
automake, libtool, and xxd.

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

## Why WASMagic?

Like many open source projects, WASMagic was created to solve my problems:

- I need to detect a diverse set of file types
  - Recent versions of libmagic work for all the file types I need
- I need to detect the mime type of a `Buffer` in Node
  - Incurring the performance penalty of disk I/O to detect a file I already had
    in memory was unacceptable

### Why existing libraries didn't meet these needs

- Non libmagic based libraries do not properly detect the filetypes I need. This
  includes the popular [file-type](https://www.npmjs.com/package/file-type)
  library.
- All libmagic Node libraries [I found](https://www.npmjs.com/search?q=libmagic)
  are using a _very_ old or broken version of libmagic. At time of writing, these
  were the libraries available:
  - [libmagic](https://www.npmjs.com/package/libmagic), 4 years old
  - [mmmagic](https://www.npmjs.com/package/mmmagic), 3 years old
  - [mime-magic](https://www.npmjs.com/package/mime-magic), 9 years old
  - [@npcz/magic](https://www.npmjs.com/package/@npcz/magic), 6 months old, but
    uses a broken version of libmagic. Misidentifies `.mp3` files
- In the case of [@npcz/magic](https://www.npmjs.com/package/@npcz/magic), it's
  API required reading the mime of a file on disk

### Why WASM instead of using `libmagic` natively?

When benchmarking against native modules like `mmmagic` I found my WASM based
proof of concept to be faster. It also seems prudent to run libmagic within the
WASM sandbox, as it bypasses security concerns about libmagic itself.
