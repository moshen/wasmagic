import wasmagicFactory from "wasmagic"; // ./dist/wasmagic.js
import { readFileSync } from "fs";
import { join } from "path";

const magicFile = readFileSync(join(__dirname, "magic.mgc"));

export class WASMagic {
  static async create(): Promise<WASMagic> {
    const Module = await wasmagicFactory();
    return new WASMagic(Module);
  }

  private Module: WasMagicModule;
  private getMimeFromWasm: typeof wrappedGetMime;

  private constructor(Module: WasMagicModule) {
    this.Module = Module;
    const writeStream = this.Module.FS.open("/magic.mgc", "w+");
    this.Module.FS.write(writeStream, magicFile, 0, magicFile.length, 0);
    this.Module.FS.close(writeStream);
    this.getMimeFromWasm = Module.cwrap("wasmagic_get_mime", "string", [
      "number",
      "number",
    ]) as typeof wrappedGetMime;
  }

  getMime(buf: Buffer): string {
    const ptr = this.Module._malloc(buf.length);
    this.Module.HEAPU8.set(buf, ptr);
    const result = this.getMimeFromWasm(ptr, buf.length);
    this.Module._free(ptr);
    return result;
  }
}
