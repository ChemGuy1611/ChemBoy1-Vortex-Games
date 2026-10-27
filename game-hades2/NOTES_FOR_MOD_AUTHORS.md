# Notes for Mod Authors - Hades II

Packaging rules for Hades II mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Manager | a `modimporter.exe` file | `Content` |
| Modutility | a `modutil.lua` file | `Content\Mods\ModUtil` |
| Loader | a `d3d12.dll` file | `Ship` |
| Plugin | a `manifest.json` file and a `main.lua` file | - |

Paths are relative to the game's install folder.

## Manager

Recognised when the archive contains a `modimporter.exe` file.

Installs to: `Content`

## Modutility

Recognised when the archive contains a `modutil.lua` file.

Installs to: `Content\Mods\ModUtil`

## Loader

Recognised when the archive contains a `d3d12.dll` file.

Installs to: `Ship`

## Plugin

Recognised when the archive contains a `manifest.json` file and a `main.lua` file.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
