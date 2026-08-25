# Notes for Mod Authors - Hades II

Packaging rules for Hades II mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Manager | a file or folder named `modimporter.exe` | `Content` |
| Modutility | a file or folder named `modutil.lua` and a file or folder named `main.lua` | `Content\Mods\ModUtil` |
| Loader | a file or folder named `d3d12.dll` | - |
| Plugin | a file or folder named `manifest.json`, a file or folder named `main.lua` and a file or folder named `d3d12.dll` | - |

Paths are relative to the game's install folder.

## Manager

Recognised when the archive contains a file or folder named `modimporter.exe`.

Installs to: `Content`

## Modutility

Recognised when the archive contains a file or folder named `modutil.lua` and a file or folder named `main.lua`.

Installs to: `Content\Mods\ModUtil`

## Loader

Recognised when the archive contains a file or folder named `d3d12.dll`.

## Plugin

Recognised when the archive contains a file or folder named `manifest.json`, a file or folder named `main.lua` and a file or folder named `d3d12.dll`.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

