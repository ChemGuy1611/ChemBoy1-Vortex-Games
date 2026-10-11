# shinryu suite Changelog

Covers `template-shinryu`. Suite file: `tests/templates/shinryu.test.js`.

## [2026-10-11]

- Changed: the `known gap` test for the root installer throwing on a marker DLL in another case now asserts the fixed install (the DLL's folder is stripped) and lost its `known gap:` prefix.
- Added: a test that the mod manager, mod, data and root installers cut at the marker itself when its name also appears in a parent folder.
- Added: two tests for the Run SRMM button's failure report. Permission, access (`EACCES`) and missing-file errors are offered for reporting and an unknown code is not, on both the rejected-promise and the thrown-error route. Suite is now 55 tests.
- Added: red proof. The three new or changed tests fail against the template as it was at the last commit and pass with the fix.

## [2026-10-06]

- Changed: the toolbar actions tests cover the new `Open Nexus Mods Page` button. It is in the registered action list, and it opens `https://www.nexusmods.com/XXX/mods`.

## [2026-10-05]

- Added: the suite, 52 tests. Covers the nested `runtime/media` paths, registration with no fallback installer, routing and the mod and root installers that share priority 27, install output, toggle gating, game definition and store launchers, setup and the SRMM download, the post-deploy notice, and the toolbar actions.
- Added: mutation check. 61 deliberate breaks of a scratch copy turned the suite red.
- Added: a `known gap` test for the root installer, which throws when the marker DLL is written in another case because the test lower-cases file names and the install does not. It turns red when the template is fixed.
