# anvilengine suite Changelog

Covers `template-anvilengine`. Suite file: `tests/templates/anvilengine.test.js`.

## [2026-10-11]

- Changed: the three `known gap` tests (Extracted wrapper cut, root wrapper cut, rename notice name) now assert the fixed results and lost their prefix. The rename notice test covers five names, including a trailing `.zip.installing` and an upper-case `.RAR`. The EACCES gap test now asserts the report is offered, on both the rejected-promise and the thrown-error route, plus an unknown code on the thrown route.
- Added: two table tests that every other cutting installer (ATK, loose .data, .forge file; Forger, Forger patch, sound, fixes, ResoRep, ResoRep textures, DLC) cuts at the marker itself when its name also appears in a parent folder. The .forge folder and .data folder installers are not in the tables: their cut cannot misfire, because a parent that contains the folder's name would itself have matched first.
- Added: a rename dialog test that a failing purge or deploy is reported with the existing error instead of being left unhandled. Suite is now 251 tests.
- Added: red proof. Seven of the changed or new test groups fail against the template as it was at the last commit and pass with the fix.

## [2026-10-06] (2)

- Changed: the toolbar actions tests cover the new `Open Nexus Mods Page` button. It is in the registered action list, and it opens `https://www.nexusmods.com/XXX/mods`, and its failure is reported instead of thrown when the shell is unavailable.

## [2026-10-06]

- Added: the suite, 247 tests. Covers registration and the priority ladder with the default toggles, one load per toggle, and a load with every feature on (which also runs the contract checks); the startup checks for conflicting toggles; routing across all fifteen installers, including case handling and FOMOD and game-id rejection; install output for every installer, including the DLC `.forge` routing and the rename placeholder; mod type target paths and retired mod types; game discovery through the Ubisoft Connect registry and the store helper; the whole game version chain (Steam build id, Epic manifests, GOG registry, the `uplay_install.manifest` hash with its modified-time cache, the executable); setup and the folders it creates; the AnvilToolkit, Forger and ResoRep downloads; the ReForger registry lookup and its download, deploy and run flow against a stand-in for the bundled `downloader.js`; the `dllsettings.ini` write and the `ori_d3d11.dll` copy against a temporary game folder and a fake Windows folder; the post-deploy reminder and the tool buttons; the `.forge` rename notice and dialog against a real temporary staging folder; the fallback notice; and the toolbar actions.
- Added: mutation check. 747 of 754 deliberate breaks of a scratch copy turned the suite red. The seven survivors: two are substrings of what they replace (`.forge` to `.forg`, `.data` to `.dat`), and stricter breaks of the same constants are killed; one is a parameter nothing passes (`check` on `downloadForger`); four change nothing observable (the rename dialog's `!== "Cancel"` test, its blank-name default that is rejected anyway, the `statSync` before `rename` whose failure lands in the same handler, and the fallback notice id regex).
- Added: `known gap` tests for three template defects, each of which turns red when the template is fixed: the Extracted and root folder installers cut the destination at the first occurrence of the folder name, so a wrapper folder ending in `Extracted` or `videos` is kept and the folder doubles; a mod name containing any character followed by `rar`, `zip` or `7z` (for example `Hunter rarity`) loses those letters in the rename notice, so its Open Mod Page and rename buttons cannot find the mod; and `runDeployTool` lists `"EACCESS"` instead of `"EACCES"`, so an access-denied failure is never offered for reporting.
- Note: the template ships `autoDownloadReforger` as `false`, while `resources/templates/TEMPLATE_ANVILENGINE.md` said `true`. The suite pins `false`; the doc table is corrected.
- Note: the folder rename dialog calls `rename()` without awaiting it, so a failed purge or deploy there is an unhandled rejection. Not pinned, because the test runner treats an unhandled rejection as a failure of the whole file.
