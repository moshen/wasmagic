type StdioOverrideFunction = (
  stdioName: "stdout" | "stderr",
  text: string,
) => void;

interface LibmagicModule extends EmscriptenModule {
  FS: typeof FS;
  ccall: typeof ccall;
  cwrap: typeof cwrap;
  printOverride: StdioOverrideFunction;
}
