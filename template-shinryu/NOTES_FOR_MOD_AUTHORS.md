# Notes for Mod Authors - template-shinryu (template)

Packaging rules for template-shinryu (template) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Shin Ryu MM | a `shinryumodmanager.exe` file | `runtime\media` |
| SRMM Mod | a `mod-meta.yaml` or `modinfo.ini` file | `runtime\media\mods` |
| Root / Game Folder Mods | a `nvngx_dlss.dll` file or a `.exe` file | the game folder |
| .par Data File | a `.par` file | `runtime\media\data` |

Paths are relative to the game's install folder.

## Shin Ryu MM

Recognised when the archive contains a `shinryumodmanager.exe` file.

Installs to: `runtime\media`

## SRMM Mod

Recognised when the archive contains a `mod-meta.yaml` or `modinfo.ini` file.

Installs to: `runtime\media\mods`

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

**Requirements:**

- Recognised by any file named `nvngx_dlss.dll`, `dstoragecore.dll`, `dstorage.dll`, `amd_fidelityfx_dx12.dll`, `amd_ags_x64.dll` or `libxess.dll`.
- Recognised by any file with the `.exe` extension.

Installs to: the game folder

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## .par Data File

Recognised when the archive contains a `.par` file.

Installs to: `runtime\media\data`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
