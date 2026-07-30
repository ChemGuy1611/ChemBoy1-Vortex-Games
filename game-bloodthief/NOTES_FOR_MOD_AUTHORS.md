# Notes for Mod Authors - Bloodthief

Packaging rules for Bloodthief mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Godotmodloader | a file or folder named `mod_loader_setup.gd` | - |
| Mod | a file with one of these extensions: `.gd` | `mods-unpacked` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Godotmodloader

Recognised when the archive contains a file or folder named `mod_loader_setup.gd`.

## Mod

Recognised when the archive contains a file with one of these extensions: `.gd`.

Installs to: `mods-unpacked`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

