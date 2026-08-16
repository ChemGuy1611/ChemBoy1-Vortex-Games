# Notes for Mod Authors - Resident Evil 2

Packaging rules for Resident Evil 2 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Fluffymanager | a file or folder named `modmanager.exe` | - |
| Reframework | a file or folder named `dinput8.dll` | - |
| Looselua | a file with the `.lua` extension and a file or folder named one of: `reframework` or `autorun` | the game folder itself (no subfolder) |
| Root / Game Folder Mods | a `nvngx_dlss.dll` file or a `.exe` file | the game folder itself (no subfolder) |
| Preset | a file or folder named `modinfo.ini` and a file with one of these extensions: `.prt` | - |
| Fluffymod | a file or folder named `modinfo.ini` and a file with the `.pak` extension | - |
| Fluffymodzip | a file or folder named `modmanager.exe` and a file or folder named `dinput8.dll` | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Fluffymanager

Recognised when the archive contains a file or folder named `modmanager.exe`.

## Reframework

Recognised when the archive contains a file or folder named `dinput8.dll`.

## Looselua

Recognised when the archive contains a file with the `.lua` extension and a file or folder named one of: `reframework` or `autorun`.

Installs to: the game folder itself (no subfolder)

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

**Requirements:**

- Recognised by any file named `nvngx_dlss.dll`, `dstoragecore.dll`, `dstorage.dll`, `amd_fidelityfx_dx12.dll`, `amd_ags_x64.dll` or `libxess.dll`.
- Recognised by any file with the `.exe` extension.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Preset

Recognised when the archive contains a file or folder named `modinfo.ini` and a file with one of these extensions: `.prt`.

## Fluffymod

Recognised when the archive contains a file or folder named `modinfo.ini` and a file with the `.pak` extension.

## Fluffymodzip

Recognised when the archive contains a file or folder named `modmanager.exe` and a file or folder named `dinput8.dll`.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

