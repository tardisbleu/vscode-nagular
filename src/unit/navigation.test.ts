import * as assert from "assert";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { ExtensionContext } from "vscode";
import * as nagular from "../extension";
import { resetStub, vscodeStub } from "./vscode-stub";

const TWINS = ["foo.component.ts", "foo.component.html", "foo.component.scss", "foo.component.spec.ts"];

/** The four starting points of the navigation, each one with the four actions. */
const NAVIGATIONS: { from: string; command: string; opens: string | null }[] = [
  { from: "foo.component.ts", command: "nagular.goToTs", opens: null },
  { from: "foo.component.ts", command: "nagular.goToHtml", opens: "foo.component.html" },
  { from: "foo.component.ts", command: "nagular.goToStyle", opens: "foo.component.scss" },
  { from: "foo.component.ts", command: "nagular.goToTest", opens: "foo.component.spec.ts" },
  { from: "foo.component.html", command: "nagular.goToHtml", opens: null },
  { from: "foo.component.html", command: "nagular.goToTs", opens: "foo.component.ts" },
  { from: "foo.component.html", command: "nagular.goToStyle", opens: "foo.component.scss" },
  { from: "foo.component.html", command: "nagular.goToTest", opens: "foo.component.spec.ts" },
  { from: "foo.component.scss", command: "nagular.goToStyle", opens: null },
  { from: "foo.component.scss", command: "nagular.goToTs", opens: "foo.component.ts" },
  { from: "foo.component.scss", command: "nagular.goToHtml", opens: "foo.component.html" },
  { from: "foo.component.scss", command: "nagular.goToTest", opens: "foo.component.spec.ts" },
  { from: "foo.component.spec.ts", command: "nagular.goToTest", opens: null },
  { from: "foo.component.spec.ts", command: "nagular.goToTs", opens: "foo.component.ts" },
  { from: "foo.component.spec.ts", command: "nagular.goToHtml", opens: "foo.component.html" },
  { from: "foo.component.spec.ts", command: "nagular.goToStyle", opens: "foo.component.scss" },
];

suite("Nagular navigation unit test suite", () => {
  let directories: string[] = [];

  setup(() => {
    resetStub();
  });

  suiteSetup(() => {
    nagular.activate({ subscriptions: [] } as unknown as ExtensionContext);
  });

  teardown(() => {
    directories.forEach((directory) => rmSync(directory, { recursive: true, force: true }));
    directories = [];
  });

  /**
   * Creates a directory holding the given files.
   *
   * @param {string[]} files - The names of the files to create.
   * @return {string} The path of the created directory.
   */
  const createDirectory = (files: string[]): string => {
    const directory = mkdtempSync(join(tmpdir(), "nagular-"));
    directories.push(directory);
    files.forEach((file) => writeFileSync(join(directory, file), ""));
    return directory;
  };

  /**
   * Makes the given file the active editor document.
   *
   * @param {string} directory - The directory holding the file.
   * @param {string} fileName - The name of the file.
   * @return {void} No return value.
   */
  const openFile = (directory: string, fileName: string): void => {
    vscodeStub.window.activeTextEditor = { document: { uri: { fsPath: join(directory, fileName) } } };
  };

  /**
   * Runs the command registered by `activate()`.
   *
   * @param {string} command - The command to run.
   * @return {Promise<void>} A promise resolved once the command is done.
   */
  const runCommand = async (command: string): Promise<void> => {
    const registered = vscodeStub.commands.registered.find((entry) => entry.command === command);
    assert.ok(registered, `activate() must register the command ${command}`);
    await registered.callback();
  };

  NAVIGATIONS.forEach(({ from, command, opens }) => {
    test(`should ${opens ? `open ${opens}` : "not open any file"} from ${from} with ${command}`, async () => {
      const directory = createDirectory(TWINS);
      openFile(directory, from);

      await runCommand(command);

      if (opens === null) {
        assert.deepStrictEqual(
          vscodeStub.window.opened,
          [],
          "no file must be opened when the target type is the current one",
        );
        assert.deepStrictEqual(
          vscodeStub.window.messages,
          [],
          "no message must be shown when the target type is the current one",
        );
      } else {
        assert.deepStrictEqual(
          vscodeStub.window.opened,
          [join(directory, opens)],
          "the exact twin file must be opened",
        );
        assert.deepStrictEqual(vscodeStub.window.messages, [], "no error message must be shown");
      }
    });
  });

  test("should report an error when no twin file exists", async () => {
    const directory = createDirectory(["foo.component.ts"]);
    openFile(directory, "foo.component.ts");

    await runCommand("nagular.goToHtml");

    assert.deepStrictEqual(vscodeStub.window.opened, [], "no file must be opened");
    assert.deepStrictEqual(vscodeStub.window.messages, ["Cannot find file to open"]);
  });

  test("should not open the twin of another component when the name holds a middle .spec", async () => {
    const directory = createDirectory(["foo.spec.component.ts", "foo.component.spec.ts"]);
    openFile(directory, "foo.spec.component.ts");

    await runCommand("nagular.goToTest");

    assert.deepStrictEqual(vscodeStub.window.opened, [], "no file must be opened");
    assert.deepStrictEqual(vscodeStub.window.messages, ["Cannot find file to open"]);
  });

  test("should report an error when several twin files exist", async () => {
    const directory = createDirectory(["foo.component.ts", "foo.component.css", "foo.component.scss"]);
    openFile(directory, "foo.component.ts");

    await runCommand("nagular.goToStyle");

    assert.deepStrictEqual(vscodeStub.window.opened, [], "no file must be opened");
    assert.deepStrictEqual(vscodeStub.window.messages, ["Cannot find file to open"]);
  });

  test("should register exactly the commands declared in package.json", () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, "..", "..", "package.json"), "utf8")) as {
      contributes: {
        commands: { command: string }[];
        menus: { "editor/title": { command: string }[] };
        keybindings: { command: string }[];
      };
    };
    const declared = manifest.contributes.commands.map((entry) => entry.command).sort();
    const menus = manifest.contributes.menus["editor/title"].map((entry) => entry.command).sort();
    const keybindings = manifest.contributes.keybindings.map((entry) => entry.command).sort();
    const registered = vscodeStub.commands.registered.map((entry) => entry.command).sort();

    assert.deepStrictEqual(
      registered,
      declared,
      "activate() must register exactly the commands declared in package.json",
    );
    assert.deepStrictEqual(
      menus,
      declared,
      "the editor/title menu must expose exactly the commands declared in package.json",
    );
    assert.deepStrictEqual(
      keybindings,
      declared,
      "the keybindings must bind exactly the commands declared in package.json",
    );
  });
});
