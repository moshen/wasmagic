import type StdioOverrideFunction from "./StdioOverrideFunction";

interface LibmagicModule extends EmscriptenModule {
  FS: typeof FS;
  ccall: typeof ccall;
  cwrap: typeof cwrap;
  printOverride: StdioOverrideFunction;
}

export default LibmagicModule;
