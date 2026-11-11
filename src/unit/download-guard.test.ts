import * as assert from "assert";
import { isIgnorableDownloadError } from "../test/runTest";

function socketError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`write ${code}`), { code, errno: -32, syscall: "write" });
}

suite("VS Code download guard unit test suite", () => {
  test("should ignore the download socket teardown error and rethrow anything else", () => {
    assert.ok(
      isIgnorableDownloadError(true, socketError("EPIPE")),
      "the EPIPE raised when the CDN closes the connection must not kill the download",
    );
    assert.ok(
      !isIgnorableDownloadError(false, socketError("EPIPE")),
      "an EPIPE raised once the download is over must not be swallowed",
    );
    assert.ok(
      !isIgnorableDownloadError(true, socketError("ECONNRESET")),
      "a connection reset is not the known teardown error and must not be swallowed",
    );
  });
});
