import * as assert from "assert";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import FileType from "../file-type";

const REPOSITORY_ROOT = join(__dirname, "..", "..");

/** The badge of each file type, keyed by the label of the type. */
const BADGES: Record<string, string> = {
  Typescript: "ts",
  HTML: "html",
  Style: "css",
  Test: "test",
};

interface ManifestCommand {
  command: string;
  icon: { light: string; dark: string };
}

const manifest = JSON.parse(readFileSync(join(REPOSITORY_ROOT, "package.json"), "utf8")) as {
  contributes: { commands: ManifestCommand[] };
};

/**
 * Finds the command declared in package.json for the given file type.
 *
 * @param {FileType} fileType - The type of file the action navigates to.
 * @return {ManifestCommand} The declared command.
 */
const declaredCommand = (fileType: FileType): ManifestCommand => {
  const declared = manifest.contributes.commands.find((entry) => entry.command === fileType.command);
  assert.ok(declared, `package.json must declare the command ${fileType.command}`);
  return declared;
};

suite("Nagular icons unit test suite", () => {
  test("should give each navigation action the badge of its own file type", () => {
    FileType.allFileType.forEach((fileType) => {
      const badge = BADGES[fileType.type];
      const declared = declaredCommand(fileType);

      assert.deepStrictEqual(
        declared.icon,
        { light: `media/badges/${badge}-light.svg`, dark: `media/badges/${badge}-dark.svg` },
        `the command ${fileType.command} must carry the badge of the ${fileType.type} files`,
      );
    });
  });

  test("should point every declared icon at an existing badge file", () => {
    FileType.allFileType.forEach((fileType) => {
      const icon = declaredCommand(fileType).icon;

      assert.ok(
        existsSync(join(REPOSITORY_ROOT, icon.light)),
        `the light badge ${icon.light} of ${fileType.command} must exist`,
      );
      assert.ok(
        existsSync(join(REPOSITORY_ROOT, icon.dark)),
        `the dark badge ${icon.dark} of ${fileType.command} must exist`,
      );
    });
  });

  test("should give each navigation action its own badge", () => {
    const icons = FileType.allFileType.map((fileType) => {
      const icon = declaredCommand(fileType).icon;
      return `${icon.light}|${icon.dark}`;
    });

    assert.strictEqual(new Set(icons).size, icons.length, "the navigation badges must be distinct");
  });
});
