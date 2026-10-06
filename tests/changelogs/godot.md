# godot suite Changelog

Covers `template-godot`. Suite file: `tests/templates/godot.test.js`.

## [2026-10-05]

- Added: the suite, 67 tests. Covers registration, routing for the loader, mod and fallback installers with the custom and stock loader, install output (loader exclusions, mod folder detection, the zip installer including repacking), the toggles that change file layout (`keepZips`, `customLoader`, `useOverrideCfg`, `ENGINE_VERSION`), game definition and launchers, setup with the custom loader download, setup with the stock loader through a stand-in for the bundled `downloader.js`, update checks, and the toolbar actions.
- Added: mutation check. 238 of 240 deliberate breaks of a scratch copy turned the suite red. The two survivors are equivalent.
- Added: a `known gap` test for the zip installer, whose archive check is case-sensitive, so a nested `.ZIP` is repacked inside another zip. It turns red when the template is fixed.
- Note: the bundled `downloader.js` is shared and is replaced by a recording stand-in here, so the suite checks what the template hands to it, not how it downloads.
