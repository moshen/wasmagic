import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { cases } from "./data";
import { WASMagic } from "../../index";

describe("WASMagic", () => {
  describe("Default magic file", () => {
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
        out.push([
          path.relative(path.resolve(__dirname, "../../../"), file),
          t,
        ]);
      }
      // console.log(JSON.stringify(out, undefined, 2));
    });

    test.each(cases)("%s identified as %s", (file, expectedOutput) => {
      expect(magic.getMime(fs.readFileSync(file))).toBe(expectedOutput);
    });
  });

  describe("Specified foobar custom magic file, with default magic file", () => {
    let magic: WASMagic;

    beforeAll(async () => {
      magic = await WASMagic.create({
        magicFiles: [fs.readFileSync(path.join(__dirname, "foobar_magic"))],
        loadDefaultMagicfile: true,
      });
    });

    test("FOOBAR file type identified as foobarfiletype", () => {
      expect(
        magic.getMime(
          Buffer.from(
            `FOOBARFILETYPE

Some made up stuff
`,
          ),
        ),
      ).toBe("foobarfiletype");
    });

    const pngOrJpeg = ["image/png", "image/jpeg"];
    test.each(cases.filter((v) => pngOrJpeg.includes(v[1])))(
      "%s identified as %s",
      (file, expectedOutput) => {
        expect(magic.getMime(fs.readFileSync(file))).toBe(expectedOutput);
      },
    );
  });

  describe("Specified png and jpeg magic files, no default magic file", () => {
    let magic: WASMagic;

    beforeAll(async () => {
      magic = await WASMagic.create({
        magicFiles: [
          fs.readFileSync(path.resolve(__dirname, "png_magic")),
          fs.readFileSync(path.resolve(__dirname, "jpeg_magic")),
        ],
        loadDefaultMagicfile: false,
      });
    });

    const pngOrJpeg = ["image/png", "image/jpeg"];
    test.each(cases.filter((v) => pngOrJpeg.includes(v[1])))(
      "%s identified as %s",
      (file, expectedOutput) => {
        expect(magic.getMime(fs.readFileSync(file))).toBe(expectedOutput);
      },
    );

    const rtfOrHtml = ["text/rtf", "text/html"];
    test.each(cases.filter((v) => rtfOrHtml.includes(v[1])))(
      "%s identified as text/plain",
      (file) => {
        expect(magic.getMime(fs.readFileSync(file))).toBe("text/plain");
      },
    );
  });
});
