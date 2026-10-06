# unity-umm suite Changelog

Covers `template-unity-umm`. Suite file: `tests/templates/unity-umm.test.js`.

## [2026-10-05] (2)

- Changed: the suite follows the template change that lets the UMM mod installer recognise a mod by its `info.json` alone and install every mod folder in an archive. Routing now covers an `info.json` with no `.dll` and an archive with several mod folders. Install output now covers each manifest folder becoming its own mod, a manifest nested inside another mod folder staying part of that mod, a manifest at the archive root owning the whole archive (named from its `Id`), and files outside every mod folder not being installed. The suite is now 96 tests (was 87).

## [2026-10-05]

- Added: the suite, 87 tests. Covers registration and mod type priorities (including the deliberate 8/10 values), routing between the root, mod, loader and fallback installers, install output, toggle gating, the UMM download and DoorstopProxy patch helpers that run offline, setup and the Unity Mod Manager download, game version resolution, and the toolbar actions.
- Added: mutation check. 130 of 133 deliberate breaks of a scratch copy turned the suite red; the survivor is equivalent (the assets folder is the parent of an already-created Managed folder).
- Added: a `known gap` test for "Open Save Folder", which hands the shell an unresolved promise because the async save path lookup is not awaited. It turns red when the template is fixed.
