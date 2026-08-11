# template-unitybepinex Changelog

## [2026-08-10]

- Added: `downloader.js` is now bundled with the template, and BepInExConfigManager is defined as a requirement (`BEPCFGMAN_REQUIREMENTS`) resolved from its GitHub releases instead of a hardcoded version URL. A `check-mods-version` handler in `context.once()` offers an update when a newer release appears, and the mod list shows the readable name rather than the archive file name. BepInEx itself is untouched and still comes from the `modtype-bepinex` extension.
- Added: `BEPCFGMAN_VARIANT` selects the BepInEx 5 or IL2CPP build of ConfigurationManager. It matches with `includes('mono')` so it works with both spellings in use across this family, `mono`/`il2cpp` and `unitymono`/`unityil2cpp`.
- Changed: `downloadBepCfgMan` delegates to the module; the `downloadCfgMan` toggle still gates both the unattended install in `setup()` and the update check.
- Removed: `BEPCFGMAN_URL`, `BEPCFGMAN_URL_ERR` and `isBepCfgManInstalled`, all superseded by the requirement definition.
- Changed: `hasXbox` is now derived from the active discovery IDs. It is declared with `let` and initialised to `false`, followed by `if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;`, so adding the Xbox app ID to `DISCOVERY_IDS_ACTIVE` is enough to switch on the Xbox version logic. Setting the initialiser to `true` still forces it on for games that need it without an Xbox ID in the list.

## [2026-07-29]

- Changed: scaffold version raised from 0.1.0 to 1.0.0 in `info.json`, the `CHANGELOG.md` entry, the `index.js` header block, and the version marker `.txt` filename. Extensions created from this template now start at 1.0.0.

## [2026-07-01]

- Changelog tracking started for this template.
