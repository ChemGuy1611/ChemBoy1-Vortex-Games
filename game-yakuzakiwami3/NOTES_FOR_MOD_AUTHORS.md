# Notes for Mod Authors - Yakuza Kiwami 3 & Dark Ties

Packaging rules for Yakuza Kiwami 3 & Dark Ties mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Modmanager | a file or folder named `shinryumodmanager.exe` | `runtime\media` |
| Mod | a file or folder named one of: `mod-meta.yaml` or `modinfo.ini` | `runtime\media\mods` |
| Root / Game Folder Mods | a `nvngx_dlss.dll` file or a `.exe` file | the game folder itself (no subfolder) |
| Data | a file with one of these extensions: `.par` | `runtime\media\data` |

Paths are relative to the game's install folder.

## Modmanager

Recognised when the archive contains a file or folder named `shinryumodmanager.exe`.

Installs to: `runtime\media`

## Mod

Recognised when the archive contains a file or folder named one of: `mod-meta.yaml` or `modinfo.ini`.

Installs to: `runtime\media\mods`

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

**Requirements:**

- Recognised by any file named `nvngx_dlss.dll`, `dstoragecore.dll`, `dstorage.dll`, `amd_fidelityfx_dx12.dll`, `amd_ags_x64.dll` or `libxess.dll`.
- Recognised by any file with the `.exe` extension.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Data

Recognised when the archive contains a file with one of these extensions: `.par`.

Installs to: `runtime\media\data`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

