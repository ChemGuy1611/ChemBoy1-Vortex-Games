# Notes for Mod Authors - God of War (2018)

Packaging rules for God of War (2018) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Scriptloader | - | - |
| Data | a file or folder named `exec` | - |
| Patchfolder | a file or folder named `patch` | `exec` |
| Execsub | a file or folder named one of: `ActivityFeed`, `cinematics`, `dc`, `languages`, `sound` or `wad` | `exec` |
| Pack | a file with one of these extensions: `.texpack` or `.lodpack` | `exec\patch\pc_le` |
| Luamod | a file or folder named `lua` and a file with one of these extensions: `.lua` | `mods` |
| Save Game Files | a `.sav` file | `USER_HOME\Saved Games\God of War\USERID_FOLDER` |

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

Recognised when the archive contains a file or folder named `lua` and a file with one of these extensions: `.lua`.

Installs to: `mods`

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file with the `.sav` extension.

Installs to: `USER_HOME\Saved Games\God of War\USERID_FOLDER`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

