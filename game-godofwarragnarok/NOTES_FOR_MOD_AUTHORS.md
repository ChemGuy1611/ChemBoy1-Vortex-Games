# Notes for Mod Authors - God of War: Ragnarok

Packaging rules for God of War: Ragnarok mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Scriptloader | - | - |
| Data | a file or folder named `exec` | - |
| Patchfolder | a file or folder named `patch` | `exec` |
| Execsub | a file or folder named one of: `ActivityFeed`, `cinematics`, `dc`, `languages`, `sound` or `wad` | `exec` |
| Pack | a file with one of these extensions: `.texpack` or `.lodpack` | `exec\patch\pc_le` |
| Luamod | a file or folder named `int9` and a file with one of these extensions: `.lua` | `mod` |
| Save | - | `userHomePathSanitize\Saved Games\God of War Ragnar\u00F6k\USERID_FOLDER` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Scriptloader

Handled by the `testLoader` installer. Inspect the extension source for the exact archive layout it expects.

## Data

Recognised when the archive contains a file or folder named `exec`.

## Patchfolder

Recognised when the archive contains a file or folder named `patch`.

Installs to: `exec`

## Execsub

Recognised when the archive contains a file or folder named one of: `ActivityFeed`, `cinematics`, `dc`, `languages`, `sound` or `wad`.

Installs to: `exec`

## Pack

Recognised when the archive contains a file with one of these extensions: `.texpack` or `.lodpack`.

Installs to: `exec\patch\pc_le`

## Luamod

Recognised when the archive contains a file or folder named `int9` and a file with one of these extensions: `.lua`.

Installs to: `mod`

## Save

Handled by the `testSave` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: `userHomePathSanitize\Saved Games\God of War Ragnar\u00F6k\USERID_FOLDER`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

