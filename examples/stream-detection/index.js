const { WASMagic } = require("../../");
const { Transform, Writable, pipeline } = require("stream");
const express = require("express");
const app = express();
const maxAcceptNonPngBytes = 1024 * 1024 * 100; // 100MB

async function init() {
  // Only initialize WASMagic once, though we are running it in the user thread,
  // if this was a production service, it would use `cluster` for this web
  // application
  const magic = await WASMagic.create();

  app.post("/file", (req, res) => {
    let bufs = [];
    let curSize = 0;
    let isDetected = false;
    let detectedMime;

    const detect = new Transform({
      transform(chunk, encoding, cb) {
        // Once we've detected the mime type, we'll just start forwarding the
        // data through
        if (isDetected) {
          this.push(chunk);
          return cb();
        }

        bufs.push(chunk);
        curSize += chunk.length;

        // Once we receive over 1KB, we can try and get the mime type of the upload
        if (curSize >= 1024) {
          const recieved = Buffer.concat(bufs);
          detectedMime = magic.getMime(recieved);
          console.log("Got a:", detectedMime);
          isDetected = true;
          // Send everything we've received to the next stream in the pipe,
          // we're doing this now so we can change the behavior based on the
          // detected type. Technically, we could operate on the buffers here,
          // but in this example it's showing how you can stack further streams
          // in the pipeline. This would be the first time those streams receive
          // data
          this.push(recieved);
          // Don't need this anymore, so we can discard it
          bufs = undefined;
        }

        cb();
      },
    });

    let processedBytes = 0;
    const start = process.hrtime.bigint();

    const doSomething = new Writable({
      write(chunk, encoding, cb) {
        processedBytes += chunk.length;

        if (detectedMime === "image/png") {
          // Do something special with our png? Stream it out to a png
          // processor?
          return cb();
        }

        // If we've received too much of something we don't want, let's just
        // hang up on them
        if (processedBytes >= maxAcceptNonPngBytes) {
          const end = process.hrtime.bigint();
          const time = Number(end - start) / 1000000;
          const bytesSecond = processedBytes / (time / 1000);
          console.log(
            `We don't want a ${detectedMime}. Hanging up.
Bytes Processed: ${processedBytes}
Duration: ${time}ms
Bytes / Second: ${bytesSecond}`,
          );
          // Even though this is in the write method of our stream, it will
          // immediately end the processing of the incoming POST and throw a
          // 'ERR_STREAM_PREMATURE_CLOSE' Error
          req.destroy();
        }

        // Otherwise do nothing, the bytes received go into the ether

        cb();
      },
    });

    console.log("\nIncoming file!");

    // Kick off reading the upload stream
    pipeline(req, detect, doSomething, (err) => {
      const end = process.hrtime.bigint();
      const time = Number(end - start) / 1000000;
      const bytesSecond = processedBytes / (time / 1000);
      if (err) {
        switch (err.code) {
          case "ERR_STREAM_PREMATURE_CLOSE":
            console.log("Closed the stream, nothing else to do");
            break;
          default:
            res.status(500).json(err);
        }
        return;
      }

      let msg;
      if (detectedMime === "image/png") {
        msg = "Processed image/png";
      } else {
        msg = `Ignored ${detectedMime}`;
        res.status(400);
      }

      console.log(`${msg}
Bytes Processed: ${processedBytes}
Duration: ${time}ms
Bytes / Second: ${bytesSecond}`);
      res.send(msg);
    });
  });

  app.listen(3000, () => {
    console.log("Server listening on 3000");
  });
}

init().catch((err) => {
  console.error(err);
  process.exit(1);
});
