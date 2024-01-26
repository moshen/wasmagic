import libmagicFactory from "../dist/libmagic-wrapper";

declare function wrappedGetMime(bufPointer: number, bufLength: number): string;

enum Flags {
  MAGIC_NONE=0x0000000 /* No flags */,
  MAGIC_DEBUG=0x0000001 /* Turn on debugging */,
  MAGIC_SYMLINK=0x0000002 /* Follow symlinks */,
  MAGIC_COMPRESS=0x0000004 /* Check inside compressed files */,
  MAGIC_DEVICES=0x0000008 /* Look at the contents of devices */,
  MAGIC_MIME_TYPE=0x0000010 /* Return the MIME type */,
  MAGIC_CONTINUE=0x0000020 /* Return all matches */,
  MAGIC_CHECK=0x0000040 /* Print warnings to stderr */,
  MAGIC_PRESERVE_ATIME=0x0000080 /* Restore access time on exit */,
  MAGIC_RAW=0x0000100 /* Don't convert unprintable chars */,
  MAGIC_ERROR=0x0000200 /* Handle ENOENT etc as real errors */,
  MAGIC_MIME_ENCODING=0x0000400 /* Return the MIME encoding */,
  MAGIC_APPLE=0x0000800 /* Return the Apple creator/type */,
  MAGIC_EXTENSION=0x1000000 /* Return a /-separated list of extensions */,
  MAGIC_COMPRESS_TRANSP=0x2000000 /* Check inside compressed files but not report compression */,
  MAGIC_NO_COMPRESS_FORK=0x4000000 /* Don't allow decompression that needs to fork */,
  MAGIC_NO_CHECK_COMPRESS=0x0001000 /* Don't check for compressed files */,
  MAGIC_NO_CHECK_TAR=0x0002000 /* Don't check for tar files */,
  MAGIC_NO_CHECK_SOFT=0x0004000 /* Don't check magic entries */,
  MAGIC_NO_CHECK_APPTYPE=0x0008000 /* Don't check application type */,
  MAGIC_NO_CHECK_ELF=0x0010000 /* Don't check for elf details */,
  MAGIC_NO_CHECK_TEXT=0x0020000 /* Don't check for text files */,
  MAGIC_NO_CHECK_CDF=0x0040000 /* Don't check for cdf files */,
  MAGIC_NO_CHECK_CSV=0x0080000 /* Don't check for CSV files */,
  MAGIC_NO_CHECK_TOKENS=0x0100000 /* Don't check tokens */,
  MAGIC_NO_CHECK_ENCODING=0x0200000 /* Don't check text encodings */,
  MAGIC_NO_CHECK_JSON=0x0400000 /* Don't check for JSON files */,
  MAGIC_NO_CHECK_SIMH=0x0800000 /* Don't check for SIMH tape files */,
}

export class WASMagic {
  static async create(flag: Flags = Flags.MAGIC_MIME_TYPE): Promise<WASMagic> {
    const Module = await libmagicFactory();
    return new WASMagic(Module, flag);
  }

  private Module: LibmagicModule;
  private getMimeFromWasm: typeof wrappedGetMime;

  private constructor(Module: LibmagicModule, flag: Flags) {
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
