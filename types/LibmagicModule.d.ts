interface LibmagicModule extends EmscriptenModule {
  FS: typeof FS;
  cwrap: typeof cwrap;
}
