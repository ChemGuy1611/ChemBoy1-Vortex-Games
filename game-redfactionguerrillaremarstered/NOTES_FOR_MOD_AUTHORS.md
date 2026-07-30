# Notes for Mod Authors - Red Faction Guerrilla Re-Mars-tered

Packaging rules for Red Faction Guerrilla Re-Mars-tered mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Manager | a file or folder named `mod manager re-mars-tered.exe` | - |
| Managerlegacy | a file or folder named `modmanager.exe` | - |
| Mod | a file or folder named one of: `modinfo.xml` | `mods` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Manager

Recognised when the archive contains a file or folder named `mod manager re-mars-tered.exe`.

## Managerlegacy

Recognised when the archive contains a file or folder named `modmanager.exe`.

## Mod

Recognised when the archive contains a file or folder named one of: `modinfo.xml`.

Installs to: `mods`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

