# Notes for Mod Authors - Red Faction Guerrilla Re-Mars-tered

Packaging rules for Red Faction Guerrilla Re-Mars-tered mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Mod Manager | a `mod manager re-mars-tered.exe` file | the game folder |
| Manager Legacy | a `modmanager.exe` file | the game folder |
| Mod | a `modinfo.xml` file | `mods` |

Paths are relative to the game's install folder.

## Mod Manager

Recognised when the archive contains a `mod manager re-mars-tered.exe` file.

Installs to: the game folder

## Manager Legacy

Recognised when the archive contains a `modmanager.exe` file.

Installs to: the game folder

## Mod

Recognised when the archive contains a `modinfo.xml` file.

Installs to: `mods`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
