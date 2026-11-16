# tfcinstaller-ue2-3 suite Changelog

Covers `template-tfcinstaller-ue2-3`. Suite file: `tests/templates/tfcinstaller-ue2-3.test.js`.

## [2026-11-15]

- Note: the template's fallback TFC Installer file id `TFC_FILE_NO` went from 8075 to 12777 (see the template's changelog entry of this date). The download test that falls back to the pinned file expects the new id in its `nxm://` link. Suite stays at 90 tests.

## [2026-11-13]

- Added: a `.upk install folder picker` group of 15 tests for the template's new `upkFolderPicker` toggle. Toggle off never asks and installs as before; the dialog's choices and buttons; Main matches the toggle-off output; a DLC choice lands under the DLC folder on the root mod type; `DLCSUB_PATH` moves the destination for the picker and the root installer; Cancel rejects; no dialog for a `Maps`/`Packages` archive, an unattended install, a loose file outside `UPKPICKER_EXTS`, or an empty `DLCSUB_FOLDERS`; the mod page link; and four variant tests (choose, top-level variant, cancel, first variant without asking).
- Added: a test that the deploy notice's "More" dialog names `[RootGameFolder]` and the `"Dashboard"` tab, following the template's wording change. Suite is now 90 tests.

## [2026-11-08]

- Note: the template's `changelog` and `readme` ignore patterns became `change?([-_ ])log` and `read?([-_ ])me` (see the template's changelog entry of this date). No test asserts those lists, so the suite is unchanged.
- Note: the template replaced the `changelog*`, `readme*` and `license*` globs in `IGNORE_CONFLICTS` and `IGNORE_DEPLOY` with document-only pairs (see the template's changelog entry of this date). No test asserts those lists, so the suite is unchanged.

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
