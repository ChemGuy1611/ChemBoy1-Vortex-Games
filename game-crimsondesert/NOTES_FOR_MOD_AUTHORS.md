# Notes for Mod Authors - Crimson Desert

Packaging rules for Crimson Desert mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Root / Game Folder Mods | a `bin64` folder | the game folder |
| Definitive Mod Manager | a `DMM_EXEC.toLowerCase()` folder | the game folder |
| Tools | a `CD JSON Mod Manager.exe`, `CrimsonSharp.exe`, `CrimsonSaveEditorStandalone.exe`, `PazGui.exe`, `CDModManager.exe`, `QT_ModManager.exe` or `CrimsonDesertModManager.exe` file | the game folder |
| Special Patch Mod | a `.dll`, `.asi` or `.addon64` file | the game folder |
| Crimson Sharp Mod | a `manifest.json` file, a `files` folder and a `meta`, `0000`, `0001`, `0002`, `0003`, `0004`, `0005`, `0006`, `0007`, `0008`, `0009`, `0010`, `0011`, `0012`, `0013`, `0014`, `0015`, `0016`, `0017`, `0018`, `0019`, `0020`, `0021`, `0022`, `0023`, `0024`, `0025`, `0026`, `0027`, `0028`, `0029`, `0030`, `0031`, `0032`, `0033`, `0034` or `0035` folder | `mods` |
| Patch Mod | a `modinfo.json` file | `mods` |
| Texture | a `meta`, `0000`, `0001`, `0002`, `0003`, `0004`, `0005`, `0006`, `0007`, `0008`, `0009`, `0010`, `0011`, `0012`, `0013`, `0014`, `0015`, `0016`, `0017`, `0018`, `0019`, `0020`, `0021`, `0022`, `0023`, `0024`, `0025`, `0026`, `0027`, `0028`, `0029`, `0030`, `0031`, `0032`, `0033`, `0034` or `0035` folder and a `.dds` file | - |
| Json | a `.json` file | `mods` |
| Binaries (Engine Injector) | a `.dll`, `.asi` or `.addon64` file | `bin64` |
| Fallback Installer | anything not matched above | the game folder |

Paths are relative to the game's install folder.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── bin64\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `bin64` in the archive.

Installs to: the game folder

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Definitive Mod Manager

Recognised when the archive contains a `DMM_EXEC.toLowerCase()` folder.

Installs to: the game folder

## Tools

Recognised when the archive contains a `CD JSON Mod Manager.exe`, `CrimsonSharp.exe`, `CrimsonSaveEditorStandalone.exe`, `PazGui.exe`, `CDModManager.exe`, `QT_ModManager.exe` or `CrimsonDesertModManager.exe` file.

Installs to: the game folder

## Special Patch Mod

Recognised when the archive contains a `.dll`, `.asi` or `.addon64` file.

Installs to: the game folder

## Crimson Sharp Mod

Recognised when the archive contains a `manifest.json` file, a `files` folder and a `meta`, `0000`, `0001`, `0002`, `0003`, `0004`, `0005`, `0006`, `0007`, `0008`, `0009`, `0010`, `0011`, `0012`, `0013`, `0014`, `0015`, `0016`, `0017`, `0018`, `0019`, `0020`, `0021`, `0022`, `0023`, `0024`, `0025`, `0026`, `0027`, `0028`, `0029`, `0030`, `0031`, `0032`, `0033`, `0034` or `0035` folder.

Installs to: `mods`

## Patch Mod

Recognised when the archive contains a `modinfo.json` file.

Installs to: `mods`

## Texture

Recognised when the archive contains a `meta`, `0000`, `0001`, `0002`, `0003`, `0004`, `0005`, `0006`, `0007`, `0008`, `0009`, `0010`, `0011`, `0012`, `0013`, `0014`, `0015`, `0016`, `0017`, `0018`, `0019`, `0020`, `0021`, `0022`, `0023`, `0024`, `0025`, `0026`, `0027`, `0028`, `0029`, `0030`, `0031`, `0032`, `0033`, `0034` or `0035` folder and a `.dds` file.

## Json

Recognised when the archive contains a `.json` file.

Installs to: `mods`

## Binaries (Engine Injector)

Recognised when the archive contains a `.dll`, `.asi` or `.addon64` file.

Installs to: `bin64`

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
