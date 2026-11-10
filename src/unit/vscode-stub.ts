import Module = require("module");
import { existsSync, readdirSync } from "fs";
import { join } from "path";

type ModuleLoader = (request: string, parent: unknown, isMain: boolean) => unknown;

/** Minimal stand-in for the `vscode` uri objects used by the extension. */
export interface StubUri {
  fsPath: string;
}

/** Minimal stand-in for the `vscode` text documents used by the extension. */
export interface StubDocument {
  uri: StubUri;
}

/** Minimal stand-in for the `vscode` text editor used by the extension. */
export interface StubTextEditor {
  document: StubDocument;
}

/** Minimal stand-in for `vscode.RelativePattern`. */
export interface StubRelativePattern {
  base: string;
  pattern: string;
}

/** A command handler registered by `activate()`. */
export interface StubCommand {
  command: string;
  callback: () => Promise<void> | void;
}

/** The surface of the `vscode` module used by the extension and by the tests. */
export interface VscodeStub {
  commands: {
    registered: StubCommand[];
    executeCommand: (...args: unknown[]) => Promise<undefined>;
    registerCommand: (command: string, callback: () => Promise<void> | void) => { dispose: () => void };
  };
  window: {
    activeTextEditor: StubTextEditor | undefined;
    onDidChangeActiveTextEditor: (listener: () => void) => { dispose: () => void };
    showInformationMessage: (message: string) => void;
    showTextDocument: (document: StubDocument) => Promise<void>;
    messages: string[];
    opened: string[];
  };
  workspace: {
    findFiles: (pattern: StubRelativePattern) => Promise<StubUri[]>;
    openTextDocument: (uri: string) => Promise<StubDocument>;
  };
  RelativePattern: new (base: string, pattern: string) => StubRelativePattern;
}

/**
 * Builds a regular expression matching the file names of a glob pattern.
 * Only the brace expansion used by `FileType.filePattern` is supported.
 *
 * @param {string} pattern - The glob pattern to convert.
 * @return {RegExp} The regular expression matching the pattern.
 */
function patternToRegExp(pattern: string): RegExp {
  const braces = /\{([^}]*)\}/.exec(pattern);
  if (braces) {
    const sources = braces[1]
      .split(",")
      .map((alternative) => patternToRegExp(pattern.replace(braces[0], alternative)).source);
    return new RegExp(`^(?:${sources.join("|")})$`);
  }
  return new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
}

/**
 * Lists the files of a directory matching the given pattern, the way
 * `vscode.workspace.findFiles` does for a relative pattern.
 *
 * @param {StubRelativePattern} pattern - The base directory and the glob pattern.
 * @return {Promise<StubUri[]>} The matching files.
 */
async function findFiles(pattern: StubRelativePattern): Promise<StubUri[]> {
  if (!existsSync(pattern.base)) {
    return [];
  }
  const regExp = patternToRegExp(pattern.pattern);
  return readdirSync(pattern.base)
    .filter((name) => regExp.test(name))
    .map((name) => ({ fsPath: join(pattern.base, name) }));
}

/**
 * Inert stand-in for the `vscode` module.
 *
 * The unit runner has no editor host: `require("vscode")` must resolve to
 * something instead of throwing MODULE_NOT_FOUND. It mirrors the API surface
 * used by src/extension.ts so that importing the extension stays harmless, and
 * it keeps the state the tests drive: the registered commands, the active
 * editor, the files opened and the messages shown.
 */
export const vscodeStub: VscodeStub = {
  commands: {
    registered: [],
    executeCommand: async () => undefined,
    registerCommand: (command, callback) => {
      vscodeStub.commands.registered.push({ command, callback });
      return { dispose: () => undefined };
    },
  },
  window: {
    activeTextEditor: undefined,
    onDidChangeActiveTextEditor: () => ({ dispose: () => undefined }),
    showInformationMessage: (message) => {
      vscodeStub.window.messages.push(message);
    },
    showTextDocument: async (document) => {
      vscodeStub.window.opened.push(document.uri.fsPath);
    },
    messages: [],
    opened: [],
  },
  workspace: {
    findFiles,
    openTextDocument: async (uri) => ({ uri: { fsPath: uri } }),
  },
  RelativePattern: class {
    constructor(
      public base: string,
      public pattern: string,
    ) {}
  },
};

/**
 * Clears the transient state of the stub between two tests. The commands
 * registered by `activate()` are kept: they live as long as the extension.
 *
 * @return {void} No return value.
 */
export function resetStub(): void {
  vscodeStub.window.activeTextEditor = undefined;
  vscodeStub.window.messages = [];
  vscodeStub.window.opened = [];
}

const loader = Module as unknown as { _load: ModuleLoader };
const originalLoad = loader._load;

loader._load = function (request: string, parent: unknown, isMain: boolean): unknown {
  if (request === "vscode") {
    return vscodeStub;
  }
  return originalLoad.call(Module, request, parent, isMain);
};
