# Notes for Mod Authors - Crimson Desert

Packaging rules for Crimson Desert mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Root / Game Folder Mods | a `bin64` folder | the game folder itself (no subfolder) |
| Dmm | a file with the `.exe` extension | - |
| Tools | a file or folder named one of: `//DMM_EXEC`, `CD JSON Mod Manager.exe`, `CrimsonSharp.exe`, `CrimsonSaveEditorStandalone.exe`, `PazGui.exe`, `CDModManager.exe`, `QT_ModManager.exe` or `CrimsonDesertModManager.exe` | - |
| Specialpatchmod | a file with the `.exe` extension and a file with one of these extensions: `.dll`, `.asi` or `.addon64` | - |
| Browsermod | a file or folder named `manifest.json`, a file or folder named `files` and a file or folder named one of: `meta`, `0000`, `0001`, `0002`, `0003`, `0004`, `0005`, `0006`, `0007`, `0008`, `0009`, `0010`, `0011`, `0012`, `0013`, `0014`, `0015`, `0016`, `0017`, `0018`, `0019`, `0020`, `0021`, `0022`, `0023`, `0024`, `0025`, `0026`, `0027`, `0028`, `0029`, `0030`, `0031`, `0032`, `0033`, `0034`, `0035`, `//'0036'`, `//this folder is used by patch mods` or `so we don't want to put it in root` | `mods` |
| Patchmod | a file or folder named one of: `modinfo.json` | `mods` |
| Vortexmod | a file with one of these extensions: `.paz` or `.pamt` and a file with one of these extensions: `.papgt`, `.pathc` or `.paver` | - |
| Texture | a file or folder named one of: `meta`, `0000`, `0001`, `0002`, `0003`, `0004`, `0005`, `0006`, `0007`, `0008`, `0009`, `0010`, `0011`, `0012`, `0013`, `0014`, `0015`, `0016`, `0017`, `0018`, `0019`, `0020`, `0021`, `0022`, `0023`, `0024`, `0025`, `0026`, `0027`, `0028`, `0029`, `0030`, `0031`, `0032`, `0033`, `0034`, `0035`, `//'0036'`, `//this folder is used by patch mods` or `so we don't want to put it in root` and a file with one of these extensions: `.dds` | - |
| Json | a file with the `.json` extension and a file or folder named one of: `modinfo.json` | - |
| Binaries | a file with the `.exe` extension and a file with one of these extensions: `.dll`, `.asi` or `.addon64` | `bin64` |
| Fallback Installer | anything not matched above | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── bin64\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `bin64` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Dmm

Recognised when the archive contains a file with the `.exe` extension.

## Tools

Recognised when the archive contains a file or folder named one of: `//DMM_EXEC`, `CD JSON Mod Manager.exe`, `CrimsonSharp.exe`, `CrimsonSaveEditorStandalone.exe`, `PazGui.exe`, `CDModManager.exe`, `QT_ModManager.exe` or `CrimsonDesertModManager.exe`.

## Specialpatchmod

Recognised when the archive contains a file with the `.exe` extension and a file with one of these extensions: `.dll`, `.asi` or `.addon64`.

## Browsermod

Recognised when the archive contains a file or folder named `manifest.json`, a file or folder named `files` and a file or folder named one of: `meta`, `0000`, `0001`, `0002`, `0003`, `0004`, `0005`, `0006`, `0007`, `0008`, `0009`, `0010`, `0011`, `0012`, `0013`, `0014`, `0015`, `0016`, `0017`, `0018`, `0019`, `0020`, `0021`, `0022`, `0023`, `0024`, `0025`, `0026`, `0027`, `0028`, `0029`, `0030`, `0031`, `0032`, `0033`, `0034`, `0035`, `//'0036'`, `//this folder is used by patch mods` or `so we don't want to put it in root`.

Installs to: `mods`

## Patchmod

Recognised when the archive contains a file or folder named one of: `modinfo.json`.

Installs to: `mods`

## Vortexmod

Recognised when the archive contains a file with one of these extensions: `.paz` or `.pamt` and a file with one of these extensions: `.papgt`, `.pathc` or `.paver`.

## Texture

Recognised when the archive contains a file or folder named one of: `meta`, `0000`, `0001`, `0002`, `0003`, `0004`, `0005`, `0006`, `0007`, `0008`, `0009`, `0010`, `0011`, `0012`, `0013`, `0014`, `0015`, `0016`, `0017`, `0018`, `0019`, `0020`, `0021`, `0022`, `0023`, `0024`, `0025`, `0026`, `0027`, `0028`, `0029`, `0030`, `0031`, `0032`, `0033`, `0034`, `0035`, `//'0036'`, `//this folder is used by patch mods` or `so we don't want to put it in root` and a file with one of these extensions: `.dds`.

## Json

Recognised when the archive contains a file with the `.json` extension and a file or folder named one of: `modinfo.json`.

## Binaries

Recognised when the archive contains a file with the `.exe` extension and a file with one of these extensions: `.dll`, `.asi` or `.addon64`.

Installs to: `bin64`

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

