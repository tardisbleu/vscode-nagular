import * as assert from "assert";
import { readFileSync } from "fs";
import { join } from "path";

const REPOSITORY_ROOT = join(__dirname, "..", "..");
const WORKFLOW = join(REPOSITORY_ROOT, ".github", "workflows", "github-actions.yml");

/** The workflow without its YAML comments: a commented-out line is not a setting. */
const readWorkflowCode = (): string =>
  readFileSync(WORKFLOW, "utf8")
    .split("\n")
    .map((line) => line.replace(/(^|\s)#.*$/, "$1"))
    .join("\n");

/** The body of a workflow job, empty when the job does not exist. */
const readJob = (code: string, name: string): string => {
  const start = code.search(new RegExp(`^ {2}${name}:$`, "m"));
  if (start === -1) {
    return "";
  }
  const job = code.slice(start);
  const next = job.search(/\n {2}\S/);
  return next === -1 ? job : job.slice(0, next);
};

suite("CI workflow unit test suite", () => {
  test("should run the headless suite, the lint and the Electron suite on the three operating systems, on Node 22, and publish only when they all pass", () => {
    const code = readWorkflowCode();

    const matrix = /os:\s*\[([^\]]*)\]/.exec(code);
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
      /fail-fast:\s*false\b/.test(code),
      "the CI must not cancel the other two operating systems when one of them fails",
    );

    assert.ok(
      /run:\s*npm run (?:test:unit|verify)\b/.test(code),
      "the CI must run the headless suite, otherwise the proofs it holds never reach the three operating systems",
    );
    assert.ok(/run:\s*npm run lint\b/.test(code), "the CI must run the lint");
    assert.ok(/run:\s*npm test\b/.test(code), "the CI must run the Electron suite");

    const nodeVersions = [...code.matchAll(/node-version:\s*['"]?([^\s'"]+)/g)].map((match) => match[1]);
    assert.ok(nodeVersions.length > 0, "the CI must pin a Node version");
    nodeVersions.forEach((version) => {
      assert.ok(
        /^22(\.|$)/.test(version),
        `the CI must run Node 22 and not ${version}: @vscode/test-electron 3.x requires it`,
      );
    });

    const build = readJob(code, "build");
    const publish = readJob(code, "publish");
    assert.ok(publish !== "", "the publication must live in its own job");
    assert.ok(/needs:\s*build\b/.test(publish), "the publication must wait for every operating system of the matrix");
    assert.ok(/npm run deploy/.test(publish), "the publication job must deploy");
    assert.ok(
      !/npm run deploy/.test(build),
      "the matrix job must not deploy, it would publish while another operating system fails",
    );
  });
});
