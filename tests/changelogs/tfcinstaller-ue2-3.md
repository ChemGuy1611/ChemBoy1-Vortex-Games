# tfcinstaller-ue2-3 suite Changelog

Covers `template-tfcinstaller-ue2-3`. Suite file: `tests/templates/tfcinstaller-ue2-3.test.js`.

## [2026-10-11]

- Changed: the `known gap` test for the cooked subfolder installer throwing on a lone `.upk` package now asserts the fixed install (the package's folder is flattened) and lost its `known gap:` prefix.
- Added: a table test that all seven cutting installers (TFC Installer, UPK Explorer, mod, root, cooked subfolder, movies, binaries) cut at the marker itself when its name also appears in a parent folder.
- Added: two tests for the Run TFC button's failure report. Permission, access (`EACCES`) and missing-file errors are offered for reporting and an unknown code is not, on both the rejected-promise and the thrown-error route. Suite is now 74 tests.
- Added: a case to that table for the cooked subfolder installer's lone `.upk` branch (`a.upk.bak/a.upk`), the one cut site that reverting the fix left unguarded.
- Added: red proof. The three new or changed tests fail against the template as it was at the last commit and pass with the fix.

## [2026-10-06]

- Changed: the toolbar actions tests cover the new `Open Nexus Mods Page` button. It is in the registered action list, and it opens `https://www.nexusmods.com/XXX/mods`.

## [2026-10-05]

- Added: the suite, 71 tests. Covers `.tfc` files being excluded from the mod extensions, the required-file folder, registration, routing, install output, toggle gating, game definition, the installer download, the post-deploy notice, and the toolbar actions.
- Added: mutation check. 100 deliberate breaks of a scratch copy turned the suite red.
- Added: a `known gap` test for `installCookedSub`, which throws on a lone `.upk` file because `indexOf` runs before the undefined check. It turns red when the template is fixed.
