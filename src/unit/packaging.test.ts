import * as assert from "assert";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { listFiles, PackageManager } from "@vscode/vsce";

const REPOSITORY_ROOT = join(__dirname, "..", "..");
const PROBE_FILE = join(REPOSITORY_ROOT, ".paperclip", "vscodeignore-probe.tmp");
/** The only files the marketplace package may hold. */
const EXPECTED_FILES = [
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "demo.gif",
  "out/extension.js",
  "out/file-type.js",
  "package.json",
];

suite("Packaging unit test suite", () => {
  test("should ship no development artifact in the packaged extension", async () => {
    mkdirSync(join(REPOSITORY_ROOT, ".paperclip"), { recursive: true });
    writeFileSync(PROBE_FILE, "");
    try {
      const files = await listFiles({ cwd: REPOSITORY_ROOT, packageManager: PackageManager.None });

      assert.deepStrictEqual(
        [...files].sort(),
        [...EXPECTED_FILES].sort(),
        "the packaged extension must hold the expected files and nothing else",
      );
    } finally {
      rmSync(PROBE_FILE, { force: true });
    }
  });
});
