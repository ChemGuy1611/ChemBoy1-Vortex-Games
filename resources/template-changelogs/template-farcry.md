# template-farcry Changelog

## [2026-08-24]

- Added: `fcmodding_browser.js` and `base_browser.js` shipped alongside `index.js`. A "Browse Far Cry Mods" sidebar page embeds the game's own section of `downloads.fcmodding.com`, and a click on a download there installs as a managed mod.
- Added: `fcmoddingBrowser` feature toggle, `FCM_BROWSER_CONFIG`, the `registerFcModdingBrowser` call in `applyGame()` and the `onceFcModdingBrowser` call in `context.once()`.
- Changed: the `fcmodding_downloader.js` import now also pulls in `downloadFcModdingRequirement`, which the browser config uses so the Mod Installer downloaded from the page keeps its own mod type.

## [2026-08-21]

- Changed: `context.once()` now calls through the local `api` constant declared at the top of the block instead of repeating `context.api` on each call.

## [2026-08-14]

- Added: `fcmodding_downloader.js` shipped alongside `index.js`. The Far Cry Mod Installer is now installed and kept up to date through the shared module rather than an inline download function.
- Added: `MI_FILENAME` and `MI_REQUIREMENTS` constants replace the hardcoded `MI_URL`. `MI_URL_ERR` stays as the manual-download page.
- Added: `check-mods-version` handler in `context.once()` and a "Download Latest FC Mod Installer" toolbar action in `applyGame()`.
- Removed: inline `downloadModInstaller()` and `isModInstallerInstalled()` — both now come from the module.
- Fixed: the Mod Installer dashboard tool pointed at `MI_EXEC` alone, which resolves against the game folder rather than the installer's own subfolder. New `MI_EXEC_PATH` constant joins `MI_PATH` and `MI_EXEC`, and the tool's `executable`/`requiredFiles` use it.

## [2026-07-29]

- Changed: scaffold version raised from 0.1.0 to 1.0.0 in `info.json`, the `CHANGELOG.md` entry, the `index.js` header block, and the version marker `.txt` filename. Extensions created from this template now start at 1.0.0.

## [2026-07-01]

- Changelog tracking started for this template.
