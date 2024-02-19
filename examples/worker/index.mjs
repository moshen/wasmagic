import * as fs from "fs/promises";
import * as assert from "assert";
import * as path from "path";
import * as os from "os";
import { Piscina } from "piscina";

import { cases as testCases } from "../../dist/test/integration/data.js";

const numCpus = os.cpus().length - 1;

const wasmagicWorkerPool = new Piscina({
  filename: "./worker.mjs",
  minThreads: numCpus,
  maxThreads: numCpus,
  idleTimeout: 10000,
});

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
  testCase.push(wasmagicWorkerPool.run(testCase[3]));
}

// Check results
for (const testCase of testCases) {
  const result = await testCase[4];
  assert.equal(result, testCase[1]);
}
