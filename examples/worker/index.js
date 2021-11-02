const fs = require("fs/promises");
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
    const file = await fs.open(path.join("..", "..", testCase[0]));
    const stats = await file.stat();
    // Copying directly into a SharedArrayBuffer is faster than copying
    // the buffer to the worker.
    // If you're loading from a file, you could just pass the file path
    // instead of the Buffer, and load the file from the worker thread.
    const sharedBuf = Buffer.from(new SharedArrayBuffer(stats.size));
    const { bytesRead } = await file.read({ buffer: sharedBuf });
    await file.close();
    assert.equal(stats.size, bytesRead);
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
