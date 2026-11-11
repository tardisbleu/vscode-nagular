# SOL-39 — Hardening the marketplace packaging and the CI install

Follow-up to the SOL-32 re-read (verdict *shipped*, two non-blocking corrections and one bonus left).

## What changed

| File | Change |
| --- | --- |
| `.vscodeignore` | added `.paperclip/**`: the Paperclip upload helper writes `.lock` and `response.XXXXXX` files in `.paperclip/`, and `vsce` shipped them to the marketplace page. |
| `.gitignore` | added `.paperclip/`: those runtime files must never show up in `git status`. |
| `.github/workflows/github-actions.yml` | `npm ci` → `npm ci --include=dev`: `npm ci` silently installs nothing but the runtime when `NODE_ENV=production`, which breaks the next step with a misleading `eslint: not found`. |
| `src/test/suite/extension.test.ts` | the two debounce tests were a copy of `src/unit/extension.test.ts`; the Electron copy is removed, the headless one (run by `npm run verify`) keeps them. |
| `src/unit/packaging.test.ts` | new: lists the files `vsce` would package and fails if any development artifact is among them. |

## Verification

```
$ npm run compile                # exit 0
$ npm run lint                   # exit 0
$ npm run verify                 # exit 0 — 24 passing
$ npx vsce ls --no-dependencies  # 7 files, no .paperclip/, no sol-*, no src/, no out/test|unit/
$ npx vsce package --no-dependencies
  DONE  Packaged: nagular.vsix (9 files, 636.8KB)   # 7 sources + extension.vsixmanifest + [Content_Types].xml
```

The new test is falsifiable: dropping `.paperclip/**` from `.vscodeignore` makes it fail with

```
+ [ '.paperclip/artifact-helper/response.PROBE123', '.paperclip/vscodeignore-probe.tmp' ]
- []
```

`npm ci --include=dev` under `NODE_ENV=production` installs eslint/mocha/tsc/vsce, while plain
`npm ci` exits 0 with an empty `node_modules/.bin` (both reproduced in a scratch copy of the manifest).

## Not verified here

`npm test` (real VS Code) cannot run in the agent container: the downloaded VS Code fails to start
with `libglib-2.0.so.0: cannot open shared object file` and there is no X display (`xvfb-run` is
absent). The suite still compiles; only the Electron run is unproven.

## Sandbox note

npm 11 masks the project path in `npm list --parseable` output (`projects/*/*/vscode-nagular`), so
`vsce` resolves no dependency folder and lists 0 files. Use `vsce ls --no-dependencies` to check the
package content in this sandbox; GitHub Actions is unaffected.
