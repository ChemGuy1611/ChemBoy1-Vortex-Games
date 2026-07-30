# Notes for Mod Authors - Alan Wake 2

Packaging rules for Alan Wake 2 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Modloader | a file or folder named `version.dll` | - |
| Folders | a file or folder named one of: `data_pc` or `data` | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Modloader

Recognised when the archive contains a file or folder named `version.dll`.

## Folders

Recognised when the archive contains a file or folder named one of: `data_pc` or `data`.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

