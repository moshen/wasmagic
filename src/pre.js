function printWrap(stdio, text) {
  if (this.printOverride) {
    this.printOverride(stdio, text);
  }
}

Module["print"] = printWrap.bind(Module, "stdout");
Module["printErr"] = printWrap.bind(Module, "stderr");
