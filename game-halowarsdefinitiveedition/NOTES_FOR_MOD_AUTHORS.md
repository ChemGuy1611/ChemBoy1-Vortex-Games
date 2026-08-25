# Notes for Mod Authors - Halo Wars: Definitive Edition

Packaging rules for Halo Wars: Definitive Edition mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Mod | a file or folder named one of: `data`, `art`, `campaign`, `physics`, `scenario`, `sound` or `video` | `Mods` |

Paths are relative to the game's install folder.

## Mod

Recognised when the archive contains a file or folder named one of: `data`, `art`, `campaign`, `physics`, `scenario`, `sound` or `video`.

Installs to: `Mods`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

