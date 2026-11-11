import * as path from "path";
import { downloadAndUnzipVSCode, runTests } from "@vscode/test-electron";

let downloading = true;

// The VS Code CDN closes the connection right after the archive is received.
// Node drops the socket error handler once the response is complete, so the
// pending TLS shutdown write fails with an EPIPE that reaches the process as an
// unhandled 'error' event and kills it before the archive is extracted.
// Swallowing that teardown error while downloading lets @vscode/test-electron
// retry the download instead of dying.
export function isIgnorableDownloadError(downloading: boolean, error: NodeJS.ErrnoException): boolean {
  return downloading && error.code === "EPIPE";
}

process.on("uncaughtException", (error: NodeJS.ErrnoException) => {
  if (!isIgnorableDownloadError(downloading, error)) {
    throw error;
  }
  console.warn(`Ignored a VS Code download socket error: ${error.message}`);
});

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    // Download VS Code, unzip it and run the integration test
    const vscodeExecutablePath = await downloadAndUnzipVSCode({ extensionDevelopmentPath });
    downloading = false;
    await runTests({ vscodeExecutablePath, extensionDevelopmentPath, extensionTestsPath });
  } catch (err) {
    console.error("Failed to run tests", err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
