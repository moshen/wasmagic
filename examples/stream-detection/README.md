# WASMagic Stream Mime Type Detection

This is a stream mime detection example, creating streams of arbitrary sizes,
detecting the mime type of the stream, and then doing something based on the
detected type. It uses `express` as a web app server implemented in `index.js`
and the `axios` http client in `client.js`.

## Why?

Dealing with streams is a common usecase for mime type detection in Node.
Dealing with file uploads (and validating the types of uploads) is another
common task. This example is to demonstrate how to effectively do both.

## Running

Running this example requires [building the parent project](../../README.md#development).

Install dependencies in this folder:

```bash
npm install
```

Run the server:

```bash
node index.js
```

While the server is running, run the client in another terminal:

```bash
node client.js
```
