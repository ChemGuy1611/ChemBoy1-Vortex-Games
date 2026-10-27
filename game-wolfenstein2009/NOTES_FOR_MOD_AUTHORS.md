# Notes for Mod Authors - Wolfenstein (2009)

Packaging rules for Wolfenstein (2009) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Base | a `base` folder | - |
| Maps | a `maps` folder | - |
| Streampacks | a `streampacks` folder | - |
| Videos | a `videos` folder | - |
| Pk4 | a `.pk4` file | - |
| Exe | a `.exe` file | - |

Paths are relative to the game's install folder.

## Base

Recognised when the archive contains a `base` folder.

## Maps

Recognised when the archive contains a `maps` folder.

## Streampacks

Recognised when the archive contains a `streampacks` folder.

## Videos

Recognised when the archive contains a `videos` folder.

## Pk4

Recognised when the archive contains a `.pk4` file.

## Exe

Recognised when the archive contains a `.exe` file.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
