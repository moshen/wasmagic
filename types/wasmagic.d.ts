interface WasMagicModule extends EmscriptenModule {
  FS: typeof FS;
  cwrap: typeof cwrap;
}

declare function wrappedGetMime(bufPointer: number, bufLength: number): string;

declare module "wasmagic" {
  const factory: EmscriptenModuleFactory<WasMagicModule>;
  export = factory;
}
