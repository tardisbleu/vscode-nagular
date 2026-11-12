import * as assert from "assert";
import { spawnSync } from "child_process";
import { existsSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { listFiles, PackageManager } from "@vscode/vsce";

const REPOSITORY_ROOT = join(__dirname, "..", "..");
const PROBE_FILE = join(REPOSITORY_ROOT, "skill.json");

/** Git has no opinion only outside a repository: every other refusal (dubious ownership, bare
 * repository) is a real failure that the assertions must report. */
const isNoGitRepository = (stderr: string): boolean => /not a git repository/i.test(stderr);

suite("Ignore rules unit test suite", () => {
  test("should keep skill.json out of the git repository and out of the packaged extension", async () => {
    const check = spawnSync("git", ["check-ignore", "-v", "skill.json"], {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      // Git translates its fatal messages, and the skip below reads them: keep them in English.
      env: { ...process.env, LC_ALL: "C" },
    });

    // Only the absence of a repository may skip the Git assertions: every other refusal
    // (dubious ownership, bare repository) must fail the test instead of hiding a broken rule.
    assert.ok(isNoGitRepository("fatal: not a git repository (or any of the parent directories): .git"));
    assert.ok(!isNoGitRepository("fatal: detected dubious ownership in repository at '/repo'"));
    assert.ok(!isNoGitRepository("fatal: this operation must be run in a work tree"));

    // Outside a Git working copy (source archive) or without Git at all, Git has no opinion:
    // the .gitignore rule is not verifiable here, so only the packaging rule is asserted.
    if (!check.error && !isNoGitRepository(check.stderr)) {
      const gitComplaint = check.stderr.trim() ? `: ${check.stderr.trim()}` : "";
      assert.strictEqual(check.status, 0, `skill.json must be git-ignored${gitComplaint}`);
      assert.match(
        check.stdout,
        /^\.gitignore:\d+:\/?skill\.json\t/m,
        "the .gitignore rule of skill.json must be the one that ignores it",
      );
    }

    // The root skill.json of a working copy belongs to the platform: it serves as the probe as it is.
    const probeAlreadyThere = existsSync(PROBE_FILE);
    if (!probeAlreadyThere) {
      writeFileSync(PROBE_FILE, "{}");
    }
    try {
      const files = await listFiles({ cwd: REPOSITORY_ROOT, packageManager: PackageManager.None });

      assert.ok(!files.includes("skill.json"), "skill.json must be excluded from the packaged extension");
    } finally {
      if (!probeAlreadyThere) {
        rmSync(PROBE_FILE, { force: true });
      }
    }
  });
});
