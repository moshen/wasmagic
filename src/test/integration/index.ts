import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { cases } from "./data";
import { WASMagic, WASMagicFlags, StdioOverrideFunction } from "../../index";

describe("WASMagic", () => {
  describe("Default magic file", () => {
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
      magicText = await WASMagic.create({
        flags: WASMagicFlags.NONE,
      });
    });

    // Dummy test to create test table output
    test.skip("Create Table", () => {
      const out: string[][] = [];
      for (const file of fileExampleList) {
        const fileBuf = fs.readFileSync(file);
        const mimeType = magic.detect(fileBuf);
        const textType = magicText.detect(fileBuf);
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
        expect(magic.detect(fileBuf)).toBe(expectedOutput);
        expect(magicText.detect(fileBuf)).toBe(expectedText);
      },
    );

    test("WASMagic throws when it fails to load", async () => {
      let err: Error | undefined;
      try {
        await WASMagic.create({
          loadDefaultMagicfile: false,
          magicFiles: [
            // To force a loading failure
            Buffer.from("FOOOOOOOBAR"),
          ],
        });
      } catch (_err) {
        err = _err as Error;
      }

      expect(err).toBeInstanceOf(Error);
      expect(err?.message.startsWith("WASMagic Load Error: ")).toBe(true);
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
        magic.detect(
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
        expect(magic.detect(fs.readFileSync(file))).toBe(expectedOutput);
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
        expect(magic.detect(fs.readFileSync(file))).toBe(expectedOutput);
      },
    );

    const rtfOrHtml = ["text/rtf", "text/html"];
    test.each(cases.filter((v) => rtfOrHtml.includes(v[1])))(
      "%s identified as text/plain",
      (file) => {
        expect(magic.detect(fs.readFileSync(file))).toBe("text/plain");
      },
    );
  });

  describe("StdioOverrideFunction", () => {
    describe("StdioOverrideFunction fires when WASMagic fails to load", () => {
      let stdioType: string | undefined;
      let text: string | undefined;
      const stdio: StdioOverrideFunction = (_stdioType, _text) => {
        stdioType = _stdioType;
        text = _text;
      };

      beforeAll(async () => {
        try {
          await WASMagic.create({
            loadDefaultMagicfile: false,
            magicFiles: [
              // To force a loading failure
              Buffer.from("FOOOOOOOBAR"),
            ],
            stdio,
          });
        } catch (_err) {
          // Ignoring _err
        }
      });

      test("stdioType is a String", () =>
        expect(typeof stdioType).toBe("string"));
      test("stdioType is stderr", () => expect(stdioType).toBe("stderr"));
      test("text is a String", () => expect(typeof text).toBe("string"));
      test("text is a known error", () =>
        expect(text).toBe("0, 1: Warning: offset `FOOOOOOOBAR' invalid"));
    });
  });
});
