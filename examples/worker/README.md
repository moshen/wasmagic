# WASMagic Worker Threads

This is a worker threads example using the
[Piscina](https://github.com/piscinajs/piscina) library. Everything here can be
done with worker threads by themselves, but the abstraction removes a couple of
steps.

## Why?

WASMagic is synchronous. If you need to do your processing off of your user
thread or you want to take advantage of multiple CPU cores, and aren't using
`cluster`.

## Running

Running this example requires [building the parent project](../../README.md#development).

Install dependencies in this folder:

```bash
npm install
```

Run:

```bash
node index.js
```
