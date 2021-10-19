const { promisify } = require("util");
const readFile = promisify(require("fs").readFile);
const assert = require("assert");
const path = require("path");
const os = require("os");
const Piscina = require("piscina");

const testCases = require("../../dist/test/integration/data.js").cases;

const numCpus = os.cpus().length - 1;

const wasmagicWorkerPool = new Piscina({
  filename: "./worker.js",
  minThreads: numCpus,
  maxThreads: numCpus,
  idleTimeout: 10000,
});

async function main() {
  // Fill Buffers
  for (const testCase of testCases) {
    const fileBuf = await readFile(path.join("..", "..", testCase[0]));
    // Copying directly into a SharedArrayBuffer is faster than copying
    // the buffer to the worker.
    // If you're loading from a file, you could just pass the file path
    // instead of the Buffer, and load the file from the worker thread.
    const sharedBuf = Buffer.from(new SharedArrayBuffer(fileBuf.length));
    sharedBuf.set(fileBuf);
    testCase.push(sharedBuf);
  }

  // Kick off the workers
  for (const testCase of testCases) {
    testCase.push(wasmagicWorkerPool.run(testCase[2]));
  }

  // Check results
  for (const testCase of testCases) {
    const result = await testCase[3];
    assert.equal(result, testCase[1]);
  }
}

main().catch((err) => console.error(err));
