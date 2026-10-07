# basic suite Changelog

Covers `template-basic`. Suite file: `tests/templates/basic.test.js`. It is the reference for the pattern the other per-template suites follow.

## [2026-10-06]

- Added: one test that the `Open Nexus Mods Page` button opens `https://www.nexusmods.com/XXX/mods`. The registered action list now includes the button.

## [2026-10-04]

- Added: the suite, 33 tests. Covers registration, routing for the root and fallback installers, install output, toggle gating, game definition and store launchers, the loader download, and the toolbar actions.
- Added: mutation check. 12 deliberate breaks of a scratch copy were applied and the suite turned red for each.
