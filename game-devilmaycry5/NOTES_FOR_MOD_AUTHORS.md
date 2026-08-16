# Notes for Mod Authors - Devil May Cry 5

Packaging rules for Devil May Cry 5 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Fluffymanager | a file or folder named `modmanager.exe` | - |
| Reframework | a file or folder named `dinput8.dll` | - |
| Looselua | a file with the `.lua` extension and a file or folder named one of: `reframework` or `autorun` | the game folder itself (no subfolder) |
| Root | a file or folder named `modinfo.ini`, a file or folder named one of: `nvngx_dlss.dll`, `dstoragecore.dll`, `dstorage.dll`, `amd_fidelityfx_dx12.dll`, `amd_ags_x64.dll` or `libxess.dll` and a file with one of these extensions: `.exe` | - |
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

## Root

Recognised when the archive contains a file or folder named `modinfo.ini`, a file or folder named one of: `nvngx_dlss.dll`, `dstoragecore.dll`, `dstorage.dll`, `amd_fidelityfx_dx12.dll`, `amd_ags_x64.dll` or `libxess.dll` and a file with one of these extensions: `.exe`.

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

