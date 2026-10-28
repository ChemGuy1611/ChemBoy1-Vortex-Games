# Notes for Mod Authors - Nioh 3

Packaging rules for Nioh 3 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| DLL Plugin Loader | a `dinput8.dll` file | the game folder |
| RDBExplorer | a `RDBExplorer.exe` file | `package` |
| Yumia fdata Tools | a `yumia_mod_insert_into_rdb.exe` file | `package` |
| Loose File Loader | a `LooseFileLoader.dll` file | `plugins` |
| ModManager | a `Nioh3ModManager.exe` file | the game folder |
| ModManager Loose Mod | a `.g1t`, `.g1m` or `.g1ts` file | `ModArchives` |
| Plugin Mod | a `.dll` or `.asi` file | `plugins` |
| .fdata Package (Yumia) | a `package` folder and a `.fdata` or `.yumiamod.json` file | the game folder |
| Fallback Installer | anything not matched above | the game folder |

Paths are relative to the game's install folder.

## DLL Plugin Loader

Recognised when the archive contains a `dinput8.dll` file.

Installs to: the game folder

## RDBExplorer

Recognised when the archive contains a `RDBExplorer.exe` file.

Installs to: `package`

## Yumia fdata Tools

Recognised when the archive contains a `yumia_mod_insert_into_rdb.exe` file.

Installs to: `package`

## Loose File Loader

Recognised when the archive contains a `LooseFileLoader.dll` file.

Installs to: `plugins`

## ModManager

Recognised when the archive contains a `Nioh3ModManager.exe` file.

Installs to: the game folder

## ModManager Loose Mod

Recognised when the archive contains a `.g1t`, `.g1m` or `.g1ts` file.

Installs to: `ModArchives`

## Plugin Mod

Recognised when the archive contains a `.dll` or `.asi` file.

Installs to: `plugins`

## .fdata Package (Yumia)

Recognised when the archive contains a `package` folder and a `.fdata` or `.yumiamod.json` file.

Installs to: the game folder

## Fallback Installer

The catch-all. Any archive that matched none of the installers above lands here and is copied across unchanged.

> **NOTE:** Landing in the fallback installer is a signal your archive layout needs fixing.

**Requirements:**

- Reaching this installer usually means the archive was not laid out in a way Vortex recognised.
- Vortex shows the user a notification when a mod installs through the fallback.

Installs to: the game folder

**Common mistakes:**

- If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report the mod as broken.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
