import * as assert from "assert";
import * as vscode from "vscode";
import * as nagular from "../../extension";
import FileType from "../../file-type";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("should debounce the function and execute it after the timeout", (done) => {
    const debouncedFn = nagular.debounce((arg1: string, arg2: number) => {
      assert.strictEqual(arg1, "test");
      assert.strictEqual(arg2, 10);
      done();
    }, 15);
    debouncedFn("test", 10);
  });

  test("should cancel the previous debounced function and execute the new one after the timeout", (done) => {
    let count = 0;
    const debouncedFn = nagular.debounce(() => {
      count++;
      if (count === 1) {
        assert.strictEqual(count, 1);
        done();
      }
    }, 10);

    debouncedFn();
    debouncedFn();
    setTimeout(debouncedFn, 25);
  });

  test("should return null if no type is found", () => {
    const fileName = "unknown.txt";
    const result = nagular.typeFile(fileName);
    assert.strictEqual(result, null);
  });

  test("should return the correct file type for known file names", () => {
    const fileName = "name.html";
    const result = nagular.typeFile(fileName);
    assert.strictEqual(result, FileType.html);

    const fileName2 = "name.ts";
    const result2 = nagular.typeFile(fileName2);
    assert.strictEqual(result2, FileType.ts);

    const fileName3 = "name.scss";
    const result3 = nagular.typeFile(fileName3);
    assert.strictEqual(result3, FileType.style);

    const fileName4 = "name.css";
    const result4 = nagular.typeFile(fileName4);
    assert.strictEqual(result4, FileType.style);

    const fileName5 = "name.less";
    const result5 = nagular.typeFile(fileName5);
    assert.strictEqual(result5, FileType.style);

    const fileName6 = "name.spec.ts";
    const result6 = nagular.typeFile(fileName6);
    assert.strictEqual(result6, FileType.test);
  });
});
