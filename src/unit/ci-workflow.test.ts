import * as assert from "assert";
import { readFileSync } from "fs";
import { join } from "path";

const REPOSITORY_ROOT = join(__dirname, "..", "..");
const WORKFLOW = join(REPOSITORY_ROOT, ".github", "workflows", "github-actions.yml");

suite("CI workflow unit test suite", () => {
  test("should run the headless suite, the lint and the Electron suite on the three operating systems", () => {
    const workflow = readFileSync(WORKFLOW, "utf8");

    const matrix = /os:\s*\[([^\]]*)\]/.exec(workflow);
    assert.deepStrictEqual(
      matrix === null
        ? []
        : matrix[1]
            .split(",")
            .map((os) => os.trim())
            .sort(),
      ["macos-latest", "ubuntu-latest", "windows-latest"],
      "the CI matrix must stay macos-latest, ubuntu-latest, windows-latest",
    );

    assert.ok(
      /fail-fast:\s*false\b/.test(workflow),
      "the CI must not cancel the other two operating systems when one of them fails",
    );

    assert.ok(
      /run:\s*npm run (?:test:unit|verify)\b/.test(workflow),
      "the CI must run the headless suite, otherwise the proofs it holds never reach the three operating systems",
    );
    assert.ok(/run:\s*npm run lint\b/.test(workflow), "the CI must run the lint");
    assert.ok(/run:\s*npm test\b/.test(workflow), "the CI must run the Electron suite");
  });
});
