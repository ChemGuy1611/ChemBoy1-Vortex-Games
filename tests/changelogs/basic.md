# basic suite Changelog

Covers `template-basic`. Suite file: `tests/templates/basic.test.js`. It is the reference for the pattern the other per-template suites follow.

## [2026-11-08]

- Note: the template's `changelog` and `readme` ignore patterns became `change?([-_ ])log` and `read?([-_ ])me` (see the template's changelog entry of this date). No test asserts those lists, so the suite is unchanged.
- Note: the template replaced the `changelog*`, `readme*` and `license*` globs in `IGNORE_CONFLICTS` and `IGNORE_DEPLOY` with document-only pairs (see the template's changelog entry of this date). No test asserts those lists, so the suite is unchanged.

## [2026-10-11]

- Added: a root installer test that a wrapper whose name ends with the root folder's name (`MyXXX/XXX`) is cut at the root folder itself.
- Added: a test that the loader, mod and save installers (loaded with their toggles on and the placeholder extensions lower-cased) cut at the marker itself when its name also appears in a parent folder. Suite is now 36 tests.
- Added: red proof. Both new tests fail against the template as it was at the last commit and pass with the fix.

## [2026-10-06]

- Added: one test that the `Open Nexus Mods Page` button opens `https://www.nexusmods.com/XXX/mods`. The registered action list now includes the button.

## [2026-10-04]

- Added: the suite, 33 tests. Covers registration, routing for the root and fallback installers, install output, toggle gating, game definition and store launchers, the loader download, and the toolbar actions.
- Added: mutation check. 12 deliberate breaks of a scratch copy were applied and the suite turned red for each.
