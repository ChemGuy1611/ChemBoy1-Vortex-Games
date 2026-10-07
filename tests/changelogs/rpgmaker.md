# rpgmaker suite Changelog

Covers `template-rpgmaker`. Suite file: `tests/templates/rpgmaker.test.js`.

## [2026-10-06]

- Changed: the toolbar actions tests cover the new `Open Nexus Mods Page` button. It is in the registered action list, and it opens `https://www.nexusmods.com/XXX/mods`, and its failure is reported instead of thrown when the shell is unavailable.

## [2026-10-05]

- Added: the suite, 90 tests. Covers registration, routing for the js folder, js file, root, json and fallback installers, install output including the plugin names stamped on the mod, setup, game definition, the toolbar actions, and the plugins.js load order run against a real temporary game folder: reading (managed plugins only, sidecar and default tiers, lock precedence, corrupt files), writing (order, enabled state, descriptions and parameters kept, `locked` kept in the sidecar only), the purge guard and the purge cleanup, and the Edit Parameters dialog with its parameter parsing helpers.
- Added: mutation check. 286 of 292 deliberate breaks of a scratch copy turned the suite red. The six survivors are equivalent.
- Added: `known gap` tests for three installer defects: the js folder installer and the root installer cut the destination at the first occurrence of the folder name, so a wrapper folder whose name contains `js` (or ends with a root folder's name) is kept or duplicated; and a plugin saved with an upper-case `.JS` extension is stamped with the extension and never listed on the Load Order page. Each turns red when the template is fixed.
- Note: the Load Order page's React components (item renderer, context menu, status filter, usage text) are not rendered, because no DOM renderer is installed. Their data side is covered.
