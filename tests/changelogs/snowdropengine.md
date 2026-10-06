# snowdropengine suite Changelog

Covers `template-snowdropengine`. Suite file: `tests/templates/snowdropengine.test.js`.

## [2026-10-05]

- Added: the suite, 32 tests. Covers registration, the `version.dll` proxy handling, routing, install output, toggle gating, game definition, setup, and the toolbar actions.
- Added: mutation check. 27 deliberate breaks of a scratch copy turned the suite red.
- Note: the mod loader and data-file installers compare lower-cased file names against upper-case placeholders, so they never match until a game fills the placeholders in. The suite uses a source transform to exercise them. Seen, not pinned.
