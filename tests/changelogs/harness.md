# harness Changelog

Covers the shared test harness in `tests/harness/`. A harness change can change what every suite proves, so each one is followed by a full `npm test` run.

## [2026-10-05] (4)

- Added: `util.copyFileAtomic` stub, a plain file copy. An extension that chains `.catch` on it (the ResoRep system dll copy in `template-anvilengine`) otherwise got `undefined` back from the no-op fallback and threw.

## [2026-10-05] (3)

- Added: the loader clears the cached copies of modules bundled inside an extension folder before each load, so listener guards and in-flight install sets start fresh.
- Added: the repo's `node_modules` is on the global module search path, so a scratch copy outside the repo, and the modules bundled inside it, resolve `semver`, `react` and the rest.
- Added: `loadExtension` takes `bundled`, a map of file name to stand-in exports, to replace a large shared bundled module such as `downloader.js` with a recording stand-in.
- Added: `util.SevenZip` stub that records the archive, files and options it was asked to add (`vortex.sevenZip.calls`); `selectors.activeProfile` and `selectors.profileById`.
- Added: helpers `withFetch(handler, run)`, which answers requests the way a remote host would and then restores the network block, and `reply()`, a minimal fetch response.

## [2026-10-05] (2)

- Added: `helpers.js` with the routing, download, shell and registry helpers the suites share; `all(...)` in `transforms.js` to combine source rewrites; stubs for `selectors.discoveryByGame` and `util.fileMD5`; the `winapi-bindings` stub is exported.
- Added: `CB1_TEMPLATE_ROOT` points the suites at a scratch copy of the templates, which is how a deliberately broken template proves a suite can fail.
- Changed: `npm test` passes `--test-timeout=30000`, so a test waiting on a promise that never settles fails instead of stalling the run.

## [2026-10-04]

- Added: the harness. `stub-modules.js` (stubs for `vortex-api`, `winapi-bindings`, `exe-version`, `vortex-parse-ini`, plus the network block), `vortex-api-stub.js`, `fake-context.js`, `load-extension.js`, `transforms.js`, `fixtures.js`.
- Added: every blocked network attempt is recorded and each suite file asserts there were none.
