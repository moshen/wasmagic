# WASMagic

[![NPM](https://img.shields.io/npm/v/wasmagic)](https://www.npmjs.com/package/wasmagic)
[![Build status](https://img.shields.io/github/actions/workflow/status/moshen/wasmagic/ci.yml?branch=master)](https://github.com/moshen/wasmagic/actions/workflows/ci.yml)

## About

A [WebAssembly](https://webassembly.org/) compiled version of
[libmagic](https://www.darwinsys.com/file/) with a simple API for Node, Bun, or
Deno. WASMagic provides accurate filetype detection with zero
prod dependencies.

## Usage

[Install `wasmagic` from npm](https://www.npmjs.com/package/wasmagic):

```bash
npm install wasmagic
```

Detect the mime of something in Node, or Bun:
```javascript
import { WASMagic } from "wasmagic";

const magic = await WASMagic.create();

const pngFile = Buffer.from("89504E470D0A1A0A0000000D49484452", "hex");
console.log(magic.detect(pngFile));
// outputs: image/png
```

CommonJS version in Node, or Bun:
```javascript
const { WASMagic } = require("wasmagic");

async function main() {
  const magic = await WASMagic.create();
  const pngFile = Buffer.from("89504E470D0A1A0A0000000D49484452", "hex");
  console.log(magic.detect(pngFile));
}

main().catch((err) => console.error(err));
// outputs: image/png
```

Deno:
```javascript
import { WASMagic } from "npm:wasmagic";
const magic = await WASMagic.create();
const pngFile = Uint8Array.from([
  0x89,  0x50,  0x4e,  0x47,  0x0d,  0x0a,  0x1a,  0x0a,
  0x00,  0x00,  0x00,  0x0d,  0x49,  0x48,  0x44,  0x52
]);
console.log(magic.getMime(pngFile));
// outputs: image/png
```

Run with permissions:
```shell
deno run \
  --allow-read="myscript.js,$PWD/node_modules/.deno/wasmagic@0.2.0/node_modules/wasmagic/dist/libmagic-wrapper.wasm" \
  myscript.js
```

WASMagic *should* also work in modern browsers by using a packaging utility like
[Rollup](https://rollupjs.org/) or [Webpack](https://webpack.js.org/), however
this isn't tested, and requires downloading the WASM payload which is currently
1.6MB.

### Options

The `WASMagic.create()` method takes an optional options object with the type
`WASMagicOptions`. These options can be used to customize file type detection by
either augmenting the default magic file or replacing it completely.

For examples on using these options, [please look at the
tests](src/test/integration/index.ts).

#### `WASMagicOptions`

```typescript
type WASMagicOptions = {
  flags?: WASMagicFlags;
  loadDefaultMagicfile?: boolean;
  magicFiles?: Uint8Array[];
  stdio?: (stdioName: "stdout" | "stderr", text: string) => void;
};
```

Default options:

```typescript
{
  flags: WASMagicFlags.MIME_TYPE,
  loadDefaultMagicfile: true,
  magicFiles: [],
  stdio: (_stdioName: "stdout" | "stderr", _text: string) => {},
}
```

##### `flags`

`flags` control `libmagic` behavior. To use the flags, import the `enum` from
the module, and pass the desired combination of flags:

```javascript
import { WASMagic, WASMagicFlags } from "wasmagic";

const magic = await WASMagic.create({
  flags: WASMagicFlags.MIME_TYPE | WASMagicFlags.MIME_ENCODING,
});

const pngFile = Buffer.from("89504E470D0A1A0A0000000D49484452", "hex");
console.log(magic.detect(pngFile));
// outputs: image/png; charset=binary
```

[Please refer to the code for the flag definitions](src/index.ts#L5)

**Default**: `WASMagicFlags.MIME_TYPE`

##### `loadDefaultMagicfile`

`loadDefaultMagicFile` is a `boolean` dictates whether or not to load the
bundled magic file. The bundled magic file is the default `magic.mgc` file
generated in the `libmagic` build.

**Default**: `true`

##### `magicFiles`

`magicFiles` is an `Array` of `Uint8Array`s representing magic definition files.
This option can be used to tell `libmagic` to use custom file type detection.

[See the test `foobarfiletype` magic file definition as an example custom file
type magic definition](src/test/integration/foobar_magic).

As these are passed as `Uint8Array`s, custom definitions can be loaded from
a file, or embedded directly in your code. For example:

```javascript
import { WASMagic } from "wasmagic";

const foobarMagic = Buffer.from(
  `
0  string  FOOBARFILETYPE  Made up filetype
!:mime foobarfiletype
`,
);

const magic = await WASMagic.create({
  magicFiles: [foobarMagic],
});

console.log(
  magic.detect(
    Buffer.from(
      `FOOBARFILETYPE

Some made up stuff
`,
    ),
  ),
);

// outputs: foobarfiletype
```

**Default**: `[]`

##### `stdio`

`stdio` is a `function` defined to override stdout / stderr output from
`libmagic`. This option might not be particularly useful for normal usage, but
very useful for getting warnings about custom magic files and debugging the
development of this module.

**Default**: `(_stdioName: "stdout" | "stderr", _text: string) => {}` (No
output)

### Examples

- [Async / Worker threads](examples/worker/)
- [Stream mime type detection](examples/stream-detection/)

### Performance considerations

#### WASMagic instantiation

You should instantiate as few copies of `WASMagic` as you can get away with for
your use case. Each instantiation loads the magic database, which is around 8MB.
One instance per process / worker thread should be enough as the main api
(`WASMagic.detect`) is synchronous.

If you want to offload processing to another thread (and in production workloads
you probably should be), take a look at the [Async / Worker
threads](examples/worker/) example.

---

If you aren't passing your instantiated dependencies down in your application,
and you aren't using Javascript modules (or Typescript), and are trying to use
this as a global, try something like the following for a CommonJS style module:

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
  console.log(magic.detect(pngFile));
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
import { WASMagic } from "wasmagic";
import * as fs from "fs/promises";

const magic = await WASMagic.create();
const file = await fs.open("largeFile.mp4");

// Only read the first 1024 bytes of our large file
const { bytesRead, buffer } = await file.read({ buffer: Buffer.alloc(1024) });

// We're assuming that largeFile.mp4 is >= 1024 bytes in size and our buffer
// will only have the first 1024 bytes of largeFile.mp4 in it
console.log(magic.detect(buffer));
await file.close();

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

WASMagic includes the default magic file which enables detection any file type
[detected by libmagic](https://github.com/file/file/tree/master/magic/Magdir),
which is over 1500 mime types. For comparison; the
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
make clean docker-builder-run test
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
