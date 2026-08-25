# template-unity-umm Changelog

## [2026-08-24]

- Added: `isDir()` helper, matching the other templates.
- Corrected: the 2026-08-22 entry below claimed Railloader support was added behind a `railloaderSupport` toggle. It never was - the Railloader constants, installers and toolbar action live only in `game-railroader`, which is the only game that has a second loader. The entry has been amended.

## [2026-08-23]

- Fixed: the "Run Unity Mod Manager" action resolves the executable from the game folder each time. It previously read a stored tool path, which for anyone migrating from the bundled `modtype-umm` extension pointed at a staging folder named after a specific UMM version and stopped working as soon as that version changed.
- Added: `setUmmTool()` repoints any registered Unity Mod Manager tool at the deployed executable in the game folder, repairing the stale entry the helper extension left behind.

## [2026-08-22]

- Added: the template now downloads and installs Unity Mod Manager itself. `downloadUmm()` fetches it from Nexus (`site/mods/21`, newest main file with a hardcoded file-ID fallback), and `installUmm()` reproduces UMM's own DoorstopProxy patch as installer instructions: `winhttp.dll` and `doorstop_config.ini` in the game folder, the manager libraries and a generated `Config.xml` under `<data>/Managed/UnityModManager`, with the installer folder kept intact so `UnityModManager.exe` stays usable as a tool. `Config.xml` is built by parsing the game's `<GameInfo>` block out of the archive's `UnityModManagerConfig.xml`, and the `System.Xml.dll` and Harmony 2.2 conditionals UMM applies are reproduced as well. New toggle `autoDownloadUmm`, default on.
- Removed: `context.requireExtension('modtype-umm')` and the `api.ext.ummAddGame` registration. The bundled helper extension no longer works - its version table stops at 0.24.2 and matches archives by exact file name, it requires a premium account, and its mod type is registered without a deploy path.
- Added: `writeUmmParams()` merges an entry for the game into UMM's own `Params.xml`, and `setUmmRegistry()` writes its `HKEY_CURRENT_USER\Software\UnityModManager` values, so the installer window opens already pointed at the game. New toggle `seedUmmParams`, default on.
- Added: `UnityModManager.exe` is registered as a tool, with a "Run Unity Mod Manager" toolbar action.
- Added: mod installer for UMM mods (`info.json` plus a `.dll`), installing into `<gamePath>/Mods/<ModName>` under a new `Mod` mod type. Archives that wrap the mod in a `Mods` folder, in a bare folder, or ship it flat all normalise to the same layout, with the folder name taken from the manifest when the archive is flat.
- Not added: Railloader support stayed in `game-railroader` rather than being backported. It is the only game with a second loader, so the Railloader constants, installers, `railloaderSupport` toggle and "Get Railloader" toolbar action have no place in a template shared by other UMM games.
- Changed: installer ladder is now ROOT 8, UMM 25, UMM mods 27, assembly 31, assets 33, fallback 49. Slots 23 and 29 are left free for a game that adds a second loader ahead of UMM and its mods, as `game-railroader` does with Railloader.

## [2026-08-21]

- Changed: `context.once()` now calls through the local `api` constant declared at the top of the block instead of repeating `context.api` on each call.

## [2026-08-10]

- Changed: `hasXbox` is now derived from the active discovery IDs. It is declared with `let` and initialised to `false`, followed by `if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;`, so adding the Xbox app ID to `DISCOVERY_IDS_ACTIVE` is enough to switch on the Xbox version logic. Setting the initialiser to `true` still forces it on for games that need it without an Xbox ID in the list.

## [2026-07-29]

- Changed: scaffold version raised from 0.1.0 to 1.0.0 in `info.json`, the `CHANGELOG.md` entry, the `index.js` header block, and the version marker `.txt` filename. Extensions created from this template now start at 1.0.0.

## [2026-07-01]

- Changelog tracking started for this template.
