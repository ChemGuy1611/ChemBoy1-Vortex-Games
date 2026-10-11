# reloaded2 suite Changelog

Covers `template-reloaded2`. Suite file: `tests/templates/reloaded2.test.js`.

## [2026-10-11]

- Added: a test that the manager, mod loader and mod installers cut at the marker itself when its name also appears in a parent folder.
- Added: two tests for the Run Reloaded (Admin) button's failure report. Permission, access (`EACCES`) and missing-file errors are offered for reporting and an unknown code is not, on both the rejected-promise and the thrown-error route. Suite is now 42 tests.
- Added: red proof. The two new report/cut tests fail against the template as it was at the last commit and pass with the fix.

## [2026-10-06]

- Changed: the toolbar actions tests cover the new `Open Nexus Mods Page` button. It is in the registered action list, and it opens `https://www.nexusmods.com/XXX/mods`.

## [2026-10-05]

- Added: the suite, 39 tests. Covers registration, `modconfig.json` mod detection, launching through the `elevate.exe` path, routing, install output, toggle gating, game definition, the Reloaded-II download, the post-deploy notice, and the toolbar actions.
- Added: mutation check. 59 deliberate breaks of a scratch copy were applied and the suite turned red for all but two equivalent changes (a placeholder constant that a transform overrides, and a redundant early return).
- Note: the loader file placeholder is upper-case but compared lower-cased, so that installer never matches until a game fills it in. The suite uses a source transform to exercise it. Seen, not pinned.
