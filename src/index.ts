import libmagicFactory from "../dist/libmagic-wrapper";

declare function wrappedGetMime(bufPointer: number, bufLength: number): string;

export enum WASMagicFlags {
  /** No flags */
  NONE = 0x0000000,
  /** Turn on debugging */
  DEBUG = 0x0000001,
  /** Follow symlinks */
  SYMLINK = 0x0000002,
  /** Check inside compressed files */
  COMPRESS = 0x0000004,
  /** Look at the contents of devices */
  DEVICES = 0x0000008,
  /** Return the MIME type */
  MIME_TYPE = 0x0000010,
  /** Return all matches */
  CONTINUE = 0x0000020,
  /** Print warnings to stderr */
  CHECK = 0x0000040,
  /** Restore access time on exit */
  PRESERVE_ATIME = 0x0000080,
  /** Don't convert unprintable chars */
  RAW = 0x0000100,
  /** Handle ENOENT etc as real errors */
  ERROR = 0x0000200,
  /** Return the MIME encoding */
  MIME_ENCODING = 0x0000400,
  /** Return the Apple creator/type */
  APPLE = 0x0000800,
  /** Return a /-separated list of extensions */
  EXTENSION = 0x1000000,
  /** Check inside compressed files but not report compression */
  COMPRESS_TRANSP = 0x2000000,
  /** Don't allow decompression that needs to fork */
  NO_COMPRESS_FORK = 0x4000000,
  /** Don't check for compressed files */
  NO_CHECK_COMPRESS = 0x0001000,
  /** Don't check for tar files */
  NO_CHECK_TAR = 0x0002000,
  /** Don't check magic entries */
  NO_CHECK_SOFT = 0x0004000,
  /** Don't check application type */
  NO_CHECK_APPTYPE = 0x0008000,
  /** Don't check for elf details */
  NO_CHECK_ELF = 0x0010000,
  /** Don't check for text files */
  NO_CHECK_TEXT = 0x0020000,
  /** Don't check for cdf files */
  NO_CHECK_CDF = 0x0040000,
  /** Don't check for CSV files */
  NO_CHECK_CSV = 0x0080000,
  /** Don't check tokens */
  NO_CHECK_TOKENS = 0x0100000,
  /** Don't check text encodings */
  NO_CHECK_ENCODING = 0x0200000,
  /** Don't check for JSON files */
  NO_CHECK_JSON = 0x0400000,
  /** Don't check for SIMH tape files */
  NO_CHECK_SIMH = 0x0800000,
}

export class WASMagic {
  static async create(
    flag: WASMagicFlags = WASMagicFlags.MIME_TYPE,
  ): Promise<WASMagic> {
    const Module = await libmagicFactory();
    return new WASMagic(Module, flag);
  }

  private Module: LibmagicModule;
  private getMimeFromWasm: typeof wrappedGetMime;

  private constructor(Module: LibmagicModule, flag: WASMagicFlags) {
    this.Module = Module;
    Module.cwrap("magic_wrapper_load", null, ["number"])(flag);
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
