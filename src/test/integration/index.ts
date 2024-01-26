import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { cases } from "./data";
import { WASMagic, WASMagicFlags } from "../../index";

describe("WASMagic", () => {
  let fileExampleList: string[];
  let magic: WASMagic;
  let magicText: WASMagic;

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
    magicText = await WASMagic.create(WASMagicFlags.NONE);
  });

  // Dummy test to create test table output
  test.skip("Create Table", () => {
    const out: string[][] = [];
    for (const file of fileExampleList) {
      const fileBuf = fs.readFileSync(file);
      const mimeType = magic.getMime(fileBuf);
      const textType = magicText.getMime(fileBuf);
      out.push([
        path.relative(path.resolve(__dirname, "../../../"), file),
        mimeType,
        textType,
      ]);
    }
    console.log(JSON.stringify(out, undefined, 2));
  });

  test.each(cases)(
    "%s identified as %s",
    (file, expectedOutput, expectedText) => {
      const fileBuf = fs.readFileSync(file);
      expect(magic.getMime(fileBuf)).toBe(expectedOutput);
      expect(magicText.getMime(fileBuf)).toBe(expectedText);
    },
  );
});
