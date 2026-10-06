# reloaded2 suite Changelog

Covers `template-reloaded2`. Suite file: `tests/templates/reloaded2.test.js`.

## [2026-10-05]

- Added: the suite, 39 tests. Covers registration, `modconfig.json` mod detection, launching through the `elevate.exe` path, routing, install output, toggle gating, game definition, the Reloaded-II download, the post-deploy notice, and the toolbar actions.
- Added: mutation check. 59 deliberate breaks of a scratch copy were applied and the suite turned red for all but two equivalent changes (a placeholder constant that a transform overrides, and a redundant early return).
- Note: the loader file placeholder is upper-case but compared lower-cased, so that installer never matches until a game fills it in. The suite uses a source transform to exercise it. Seen, not pinned.
