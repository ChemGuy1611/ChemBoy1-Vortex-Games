# Notes for Mod Authors - Alien Isolation

Packaging rules for Alien Isolation mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Datafolder | - | - |
| Datafiles | a file with one of these extensions: `.bin`, `.bml`, `.xml` or `.pak` | `DATA` |

Paths are relative to the game's install folder.

## Datafolder

Handled by the `testDataFolder` installer. Inspect the extension source for the exact archive layout it expects.

## Datafiles

Recognised when the archive contains a file with one of these extensions: `.bin`, `.bml`, `.xml` or `.pak`.

Installs to: `DATA`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

