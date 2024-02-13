import libmagicFactory from "../dist/libmagic-wrapper";

declare function wrappedGetMime(bufPointer: number, bufLength: number): string;

export type WASMagicOptions = {
  loadDefaultMagicfile?: boolean;
  magicFiles?: Uint8Array[];
  stdio?: StdioOverrideFunction;
};

type WASMagicOptionsComplete = {
  loadDefaultMagicfile: boolean;
  magicFiles: Uint8Array[];
  stdio: StdioOverrideFunction;
};

const defaultWASMagicOptions: WASMagicOptionsComplete = Object.freeze({
  loadDefaultMagicfile: true,
  magicFiles: [],
  stdio: (_stdioName: "stdout" | "stderr", _text: string) => {},
});

export class WASMagic {
  static async create(
    options: WASMagicOptions = defaultWASMagicOptions,
  ): Promise<WASMagic> {
    const Module = await libmagicFactory();
    return new WASMagic(Module, options);
  }

  private Module: LibmagicModule;
  private getMimeFromWasm: typeof wrappedGetMime;

  private constructor(Module: LibmagicModule, inputOptions: WASMagicOptions) {
    const options = Object.assign({}, defaultWASMagicOptions, inputOptions);
    Module.printOverride = options.stdio;

    Module.FS.chdir("/magic");

    const magicPaths: string[] = [];

    // Write each magic file to the interal WASM filesystem
    for (let i = 0; i < options.magicFiles.length; i++) {
      Module.FS.writeFile(`/magic/${i}`, options.magicFiles[i]);
      magicPaths.push(`${i}`);
    }

    if (options.loadDefaultMagicfile) {
      magicPaths.push("magic.mgc");
    }

    const loadErr = Module.ccall(
      "magic_wrapper_load",
      "string",
      ["string"],
      [magicPaths.join(":")],
    );

    if (loadErr !== "") {
      throw new Error(`WASMagic Load Error: ${loadErr}`);
    }

    // Remove each magic file from the interal WASM filesystem
    // This frees available memory
    for (let i = 0; i < options.magicFiles.length; i++) {
      Module.FS.unlink(`/magic/${i}`);
    }
    Module.FS.unlink("/magic/magic.mgc");

    this.Module = Module;
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
