# cobraengine-acse suite Changelog

Covers `template-cobraengineACSE`. Suite file: `tests/templates/cobraengine-acse.test.js`.

## [2026-10-25]

- Changed: the registration and `fallbackInstaller` toggle tests expect the save installer at priority 48, one step ahead of the fallback at 49. The `installer-priority-unique` allowlist entry for this template is removed.

## [2026-10-11]

- Changed: the `known gap` test for the Saves folder made by `setup` now asserts the fixed result (the next load still opens `Saves` and `Config` directly under the game's Saved Games folder) and lost its `known gap:` prefix.
- Added: a test that stray `Saves` and `config` folders are skipped (any case) when a real user id folder sits after them.
- Added: a table test that all seven cutting installers (ACSE, root, mod, localised, ovldata, movies, save) cut at the marker itself when its name also appears in a parent folder. Suite is now 51 tests.
- Added: red proof. The three new or changed tests fail against the template as it was at the last commit and pass with the fix.

## [2026-10-06]

- Changed: the toolbar actions tests cover the new `Open Nexus Mods Page` button. It is in the registered action list, and it opens `https://www.nexusmods.com/XXX/mods`.

## [2026-10-05]

- Added: the suite, 49 tests. Covers `.ovl` files under `Win64/ovldata`, the installers that share priority 49, routing, install output, toggle gating, game definition, setup and the save folder, and the toolbar actions.
- Added: mutation check. 76 deliberate breaks of a scratch copy were applied and the suite turned red for all but one change to a `low` priority that no mod type uses.
- Added: a `known gap` test for `setup`, which creates `<Saved Games>\<game>\Saves`; the next load takes that as the user-id folder and resolves `Saves\Saves`. It turns red when the template is fixed.
