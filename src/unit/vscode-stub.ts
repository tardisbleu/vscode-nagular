import Module = require("module");

type ModuleLoader = (request: string, parent: unknown, isMain: boolean) => unknown;

/**
 * Inert stand-in for the `vscode` module.
 *
 * The unit runner has no editor host: `require("vscode")` must resolve to
 * something instead of throwing MODULE_NOT_FOUND. It mirrors the API surface
 * used by src/extension.ts so that importing the extension stays harmless.
 */
const vscodeStub = {
  commands: {
    executeCommand: async () => undefined,
    registerCommand: () => ({ dispose: () => undefined }),
  },
  window: {
    activeTextEditor: undefined,
    onDidChangeActiveTextEditor: () => ({ dispose: () => undefined }),
    showInformationMessage: () => undefined,
    showTextDocument: async () => undefined,
  },
  workspace: {
    findFiles: async () => [],
    openTextDocument: async () => undefined,
  },
  RelativePattern: class {
    constructor(
      public base: unknown,
      public pattern: unknown,
    ) {}
  },
};

const loader = Module as unknown as { _load: ModuleLoader };
const originalLoad = loader._load;

loader._load = function (request: string, parent: unknown, isMain: boolean): unknown {
  if (request === "vscode") {
    return vscodeStub;
  }
  return originalLoad.call(Module, request, parent, isMain);
};
