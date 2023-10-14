import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { cases } from "./data";
import { WASMagic } from "../../index";

describe("WASMagic", () => {
  let fileExampleList: string[];
  let magic: WASMagic;

  beforeAll(async () => {
    const xbyxRegexp = /[0-9]+x[0-9]+/;
    fileExampleList = (
      await glob(path.join(__dirname, "../../../vendor/file-examples/**"), {
        nodir: true,
      })
    )
      .sort()
      .filter((f) => !xbyxRegexp.test(f));
    magic = await WASMagic.create();
  });

  // Dummy test to create test table output
  test("Create Table", () => {
    const out: string[][] = [];
    for (const file of fileExampleList) {
      const fileBuf = fs.readFileSync(file);
      const t = magic.getMime(fileBuf);
      out.push([path.relative(path.resolve(__dirname, "../../../"), file), t]);
    }
    // console.log(JSON.stringify(out, undefined, 2));
  });

  test.each(cases)("%s identified as %s", (file, expectedOutput) => {
    expect(magic.getMime(fs.readFileSync(file))).toBe(expectedOutput);
  });
});
