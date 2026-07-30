# Notes for Mod Authors - Nioh 3

Packaging rules for Nioh 3 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Dllloader | a file or folder named `dinput8.dll` | - |
| Rdbexplorer | a file or folder named `RDBExplorer.exe` | `package` |
| Yumia | a file or folder named `yumia_mod_insert_into_rdb.exe` | `package` |
| Looseloader | a file or folder named `LooseFileLoader.dll` | `plugins` |
| Modmanager | a file or folder named `Nioh3ModManager.exe` | the game folder itself (no subfolder) |
| Mod | a file with one of these extensions: `.g1t`, `.g1m` or `.g1ts` | - |
| Loadermod | a file with one of these extensions: `.dll` or `.asi` | `plugins` |
| Fdatayumia | a file or folder named `package` and a file with one of these extensions: `.fdata` or `.yumiamod.json` | the game folder itself (no subfolder) |
| Fallback Installer | anything not matched above | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Dllloader

Recognised when the archive contains a file or folder named `dinput8.dll`.

## Rdbexplorer

Recognised when the archive contains a file or folder named `RDBExplorer.exe`.

Installs to: `package`

## Yumia

Recognised when the archive contains a file or folder named `yumia_mod_insert_into_rdb.exe`.

Installs to: `package`

## Looseloader

Recognised when the archive contains a file or folder named `LooseFileLoader.dll`.

Installs to: `plugins`

## Modmanager

Recognised when the archive contains a file or folder named `Nioh3ModManager.exe`.

Installs to: the game folder itself (no subfolder)

## Mod

Recognised when the archive contains a file with one of these extensions: `.g1t`, `.g1m` or `.g1ts`.

## Loadermod

Recognised when the archive contains a file with one of these extensions: `.dll` or `.asi`.

Installs to: `plugins`

## Fdatayumia

Recognised when the archive contains a file or folder named `package` and a file with one of these extensions: `.fdata` or `.yumiamod.json`.

Installs to: the game folder itself (no subfolder)

## Fallback Installer

The catch-all. Any archive that matched none of the installers above lands here and is copied across unchanged.

> **NOTE:** Landing in the fallback installer is a signal your archive layout needs fixing.

**Requirements:**

- Reaching this installer usually means the archive was not laid out in a way Vortex recognised.
- Vortex shows the user a notification when a mod installs through the fallback.

**Common mistakes:**

- If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report the mod as broken.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

