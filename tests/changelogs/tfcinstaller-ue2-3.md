# tfcinstaller-ue2-3 suite Changelog

Covers `template-tfcinstaller-ue2-3`. Suite file: `tests/templates/tfcinstaller-ue2-3.test.js`.

## [2026-10-06]

- Changed: the toolbar actions tests cover the new `Open Nexus Mods Page` button. It is in the registered action list, and it opens `https://www.nexusmods.com/XXX/mods`.

## [2026-10-05]

- Added: the suite, 71 tests. Covers `.tfc` files being excluded from the mod extensions, the required-file folder, registration, routing, install output, toggle gating, game definition, the installer download, the post-deploy notice, and the toolbar actions.
- Added: mutation check. 100 deliberate breaks of a scratch copy turned the suite red.
- Added: a `known gap` test for `installCookedSub`, which throws on a lone `.upk` file because `indexOf` runs before the undefined check. It turns red when the template is fixed.
