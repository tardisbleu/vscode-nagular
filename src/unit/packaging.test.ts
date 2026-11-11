import * as assert from "assert";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { listFiles, PackageManager } from "@vscode/vsce";

const REPOSITORY_ROOT = join(__dirname, "..", "..");
const PROBE_FILE = join(REPOSITORY_ROOT, ".paperclip", "vscodeignore-probe.tmp");

suite("Packaging unit test suite", () => {
  test("should ship no development artifact in the packaged extension", async () => {
    mkdirSync(join(REPOSITORY_ROOT, ".paperclip"), { recursive: true });
    writeFileSync(PROBE_FILE, "");
    try {
      const files = await listFiles({ cwd: REPOSITORY_ROOT, packageManager: PackageManager.None });

      assert.ok(files.includes("package.json"), "package.json must be packaged");
      assert.deepStrictEqual(
        files.filter((file) => /^\.paperclip\/|^sol-|^src\/|^out\/(test|unit)\//.test(file)),
        [],
        "the packaged extension must contain no development artifact",
      );
    } finally {
      rmSync(PROBE_FILE, { force: true });
    }
  });
});
