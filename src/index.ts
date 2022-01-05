import libmagicFactory from "../dist/libmagic-wrapper";

declare function wrappedGetMime(bufPointer: number, bufLength: number): string;

export class WASMagic {
  static async create(): Promise<WASMagic> {
    const Module = await libmagicFactory();
    return new WASMagic(Module);
  }

  private Module: LibmagicModule;
  private getMimeFromWasm: typeof wrappedGetMime;

  private constructor(Module: LibmagicModule) {
    this.Module = Module;
    Module.cwrap("magic_wrapper_load", null, [])();
    this.getMimeFromWasm = Module.cwrap("magic_wrapper_get_mime", "string", [
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
