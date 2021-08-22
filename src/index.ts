import wasmagicFactory from "wasmagic"; // ./dist/wasmagic.js

export class WASMagic {
  static async create(): Promise<WASMagic> {
    const Module = await wasmagicFactory();
    return new WASMagic(Module);
  }

  private Module: WasMagicModule;
  private getMimeFromWasm: typeof wrappedGetMime;

  private constructor(Module: WasMagicModule) {
    this.Module = Module;
    this.getMimeFromWasm = Module.cwrap("wasmagic_get_mime", "string", [
      "number",
      "number",
    ]) as typeof wrappedGetMime;
  }

  getMime(buf: Uint8Array): string {
    const ptr = this.Module._malloc(buf.length);
    this.Module.HEAPU8.set(buf, ptr);
    const result = this.getMimeFromWasm(ptr, buf.length);
    this.Module._free(ptr);
    return result;
  }
}
