# Notes for Mod Authors - Wolfenstein (2009)

Packaging rules for Wolfenstein (2009) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Base | a file or folder named `base`, a file or folder named `SP` and a file or folder named `MP` | - |
| Maps | a file or folder named `maps`, a file or folder named `SP` and a file or folder named `MP` | - |
| Streampacks | a file or folder named `streampacks`, a file or folder named `SP` and a file or folder named `MP` | - |
| Videos | a file or folder named `videos`, a file or folder named `SP` and a file or folder named `MP` | - |
| Pk4 | a file or folder named `SP`, a file or folder named `MP` and a file with the `.pk4` extension | - |
| Exe | a file or folder named `SP`, a file or folder named `MP` and a file with the `.exe` extension | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Base

Recognised when the archive contains a file or folder named `base`, a file or folder named `SP` and a file or folder named `MP`.

## Maps

Recognised when the archive contains a file or folder named `maps`, a file or folder named `SP` and a file or folder named `MP`.

## Streampacks

Recognised when the archive contains a file or folder named `streampacks`, a file or folder named `SP` and a file or folder named `MP`.

## Videos

Recognised when the archive contains a file or folder named `videos`, a file or folder named `SP` and a file or folder named `MP`.

## Pk4

Recognised when the archive contains a file or folder named `SP`, a file or folder named `MP` and a file with the `.pk4` extension.

## Exe

Recognised when the archive contains a file or folder named `SP`, a file or folder named `MP` and a file with the `.exe` extension.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

