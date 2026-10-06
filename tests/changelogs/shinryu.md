# shinryu suite Changelog

Covers `template-shinryu`. Suite file: `tests/templates/shinryu.test.js`.

## [2026-10-05]

- Added: the suite, 52 tests. Covers the nested `runtime/media` paths, registration with no fallback installer, routing and the mod and root installers that share priority 27, install output, toggle gating, game definition and store launchers, setup and the SRMM download, the post-deploy notice, and the toolbar actions.
- Added: mutation check. 61 deliberate breaks of a scratch copy turned the suite red.
- Added: a `known gap` test for the root installer, which throws when the marker DLL is written in another case because the test lower-cases file names and the install does not. It turns red when the template is fixed.
