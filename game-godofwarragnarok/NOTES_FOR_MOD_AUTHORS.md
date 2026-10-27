# Notes for Mod Authors - God of War: Ragnarok

Packaging rules for God of War: Ragnarok mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Scriptloader | a `winmm.dll` file and a `GOWR-Script-Loader.ini` file | the game folder |
| Data | a `exec` folder | the game folder |
| Patchfolder | a `patch` folder | `exec` |
| Execsub | a `ActivityFeed`, `cinematics`, `dc`, `languages`, `sound` or `wad` folder | `exec` |
| Pack | a `.texpack` or `.lodpack` file | `exec\patch\pc_le` |
| Luamod | a `int9` folder and a `.lua` file | `mod` |
| Save | - | - |

Paths are relative to the game's install folder.

## Scriptloader

Recognised when the archive contains a `winmm.dll` file and a `GOWR-Script-Loader.ini` file.

Installs to: the game folder

## Data

Recognised when the archive contains a `exec` folder.

Installs to: the game folder

## Patchfolder

Recognised when the archive contains a `patch` folder.

Installs to: `exec`

## Execsub

Recognised when the archive contains a `ActivityFeed`, `cinematics`, `dc`, `languages`, `sound` or `wad` folder.

Installs to: `exec`

## Pack

Recognised when the archive contains a `.texpack` or `.lodpack` file.

Installs to: `exec\patch\pc_le`

## Luamod

Recognised when the archive contains a `int9` folder and a `.lua` file.

Installs to: `mod`

## Save

Handled by the `testSave` installer. Inspect the extension source for the exact archive layout it expects.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
