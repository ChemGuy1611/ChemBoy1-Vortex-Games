# rpgmaker suite Changelog

Covers `template-rpgmaker`. Suite file: `tests/templates/rpgmaker.test.js`.

## [2026-10-12]

- Changed: the suite follows the removal of the template's `isPurging` guard. The `purge guard` group (six tests that held the load order frozen between `will-purge` and the next `did-deploy`) is gone; its two purge cleanup tests stay under a new `purge cleanup` group.
- Changed: the event bus test now expects a `did-purge` listener and no `will-purge` or `did-deploy` listener.
- Added: a test that a load order read and write during a purge go through normally and dispatch nothing.
- Changed: the event bus test now also expects the `did-deploy` hook the template registers through `onAsync`.
- Added: three tests for the write-back after a purge (a deployed plugin missing from plugins.js is written back with its parameters and without `locked`; plugins.js is left byte for byte alone when it already lists every managed plugin; another game's or a non-active profile is ignored) and one that the sidecar's `locked` flag stays out of plugins.js. The harness records `onAsync` hooks without firing them, so the tests call the recorded hook directly. Suite is now 91 tests.

## [2026-10-11]

- Changed: the three `known gap` tests (js folder wrapper cut, upper-case `.JS` stamp, root installer wrapper cut) now assert the fixed results and lost their `known gap:` prefix. The js folder case also checks that the plugin names are stamped.
- Added: a test that the js file and json installers cut at the marker file itself when its name also appears in a parent folder (`A.js.bak/A.js`).
- Added: a load order test that a deployed `B.JS` plugin is listed. Suite is now 92 tests.
- Added: red proof. Five of the changed tests fail against the template as it was at the last commit and pass with the fix.

## [2026-10-09]

- Changed: the suite follows the template's new default executable. `EXEC` is `Game.exe` (the usual RPG Maker executable) instead of `XXX.exe`, so the custom launch tool, the required files and the executable choice tests expect `Game.exe`; the template's `IGNORE_CONFLICTS` and `IGNORE_DEPLOY` lists gained `**/plugins.js`, which the game definition test expects.

## [2026-10-06]

- Changed: the toolbar actions tests cover the new `Open Nexus Mods Page` button. It is in the registered action list, and it opens `https://www.nexusmods.com/XXX/mods`, and its failure is reported instead of thrown when the shell is unavailable.

## [2026-10-05]

- Added: the suite, 90 tests. Covers registration, routing for the js folder, js file, root, json and fallback installers, install output including the plugin names stamped on the mod, setup, game definition, the toolbar actions, and the plugins.js load order run against a real temporary game folder: reading (managed plugins only, sidecar and default tiers, lock precedence, corrupt files), writing (order, enabled state, descriptions and parameters kept, `locked` kept in the sidecar only), the purge guard and the purge cleanup, and the Edit Parameters dialog with its parameter parsing helpers.
- Added: mutation check. 286 of 292 deliberate breaks of a scratch copy turned the suite red. The six survivors are equivalent.
- Added: `known gap` tests for three installer defects: the js folder installer and the root installer cut the destination at the first occurrence of the folder name, so a wrapper folder whose name contains `js` (or ends with a root folder's name) is kept or duplicated; and a plugin saved with an upper-case `.JS` extension is stamped with the extension and never listed on the Load Order page. Each turns red when the template is fixed.
- Note: the Load Order page's React components (item renderer, context menu, status filter, usage text) are not rendered, because no DOM renderer is installed. Their data side is covered.
