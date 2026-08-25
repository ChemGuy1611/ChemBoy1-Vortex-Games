# Notes for Mod Authors - Hades

Packaging rules for Hades mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Manager | a file or folder named `modimporter.exe` | `Content` |
| Modutility | a file or folder named `ModUtil` | `Content\Mods` |

Paths are relative to the game's install folder.

## Manager

Recognised when the archive contains a file or folder named `modimporter.exe`.

Installs to: `Content`

## Modutility

Recognised when the archive contains a file or folder named `ModUtil`.

Installs to: `Content\Mods`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

