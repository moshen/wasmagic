const { default: axios } = require("axios");
const { Readable } = require("node:stream");
const pngFile = Buffer.from("89504E470D0A1A0A0000000D49484452", "hex"); // png header
const zeros = Buffer.alloc(1024 * 16, 0); // Fill a 16KB buffer with zeros

// This file really doesn't have anything relevant to WASMagic usage, it's just
// generating large fake pngs to upload

async function postData(sourceBuf, maxSendBytes) {
  let position = 0;
  const data = new Readable({
    read(size) {
      let fill = 0;
      if (position === 0) {
        this.push(sourceBuf);
        position += sourceBuf.length;
        // `size` will typically be at least (or exactly) 16k
        fill = size - position;
      }

      while (true) {
        const sending = zeros.slice(0, fill || size);
        position += sending.length;

        // End the read stream after we've sent our data
        if (position > maxSendBytes) {
          this.push(null);
          break;
        }

        // Obeying Node stream flow control
        if (sending.length < 1 || !this.push(sending)) {
          break;
        }
      }
    },
  });

  const start = process.hrtime.bigint();
  let end;
  let timeMs;
  let msg;
  try {
    const res = await axios({
      method: "post",
      url: "http://localhost:3000/file",
      headers: { "Content-Type": "application/octet-stream" },
      data,
      maxContentLength: Number.POSITIVE_INFINITY,
      maxBodyLength: Number.POSITIVE_INFINITY,
    });

    end = process.hrtime.bigint();
    timeMs = Number(end - start) / 1000000;
    msg = `Status: ${res.status}
Response: "${res.data}"`;
  } catch (err) {
    // End our read stream
    data.destroy();
    end = process.hrtime.bigint();
    timeMs = Number(end - start) / 1000000;
    if (err.response) {
      msg = `Status: ${err.response.status}
Response: "${err.response.data}"`;
    } else {
      msg = `Received error: "${err.code}". We were rejected.`;
    }
  }

  const bytesSecond = position / (timeMs / 1000);
  console.log(`${msg}
Bytes: ${position}
Duration: ${timeMs}ms
Bytes / Second: ${bytesSecond}`);
}

async function main() {
  console.log("Send 10GB png...");
  await postData(pngFile, 1024 * 1024 * 1024 * 10);

  console.log("\nSend 10GB zeros...");
  await postData(zeros, 1024 * 1024 * 1024 * 10);

  console.log("\nSend 10MB zeros...");
  await postData(zeros, 1024 * 1024 * 10);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
