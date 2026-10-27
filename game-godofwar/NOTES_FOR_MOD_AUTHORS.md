# Notes for Mod Authors - God of War (2018)

Packaging rules for God of War (2018) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Scriptloader | a `version.dll` file and a `loader_config.toml` file | the game folder |
| Data | a `exec` folder | the game folder |
| Patchfolder | a `patch` folder | `exec` |
| Execsub | a `ActivityFeed`, `cinematics`, `dc`, `languages`, `sound` or `wad` folder | `exec` |
| Pack | a `.texpack` or `.lodpack` file | `exec\patch\pc_le` |
| Luamod | a `lua` folder and a `.lua` file | `mods` |
| Save Game Files | a `.sav` file | `%USERPROFILE%\Saved Games\God of War\<User ID>` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Scriptloader

Recognised when the archive contains a `version.dll` file and a `loader_config.toml` file.

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

Recognised when the archive contains a `lua` folder and a `.lua` file.

Installs to: `mods`

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file with the `.sav` extension.

Installs to: `%USERPROFILE%\Saved Games\God of War\<User ID>`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
