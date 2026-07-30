# Notes for Mod Authors - Indiana Jones and the Great Circle

Packaging rules for Indiana Jones and the Great Circle mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Config | a file with one of these extensions: `.local` or `.cfg` | `USER_DOCS\Saved Games\MachineGames\TheGreatCircle\base` |
| Save Game Files | a `.dat` file | `ROAMINGAPPDATA\GSE Saves\2677660\remote\GAME-SLOT0` |
| Sounds | a file with one of these extensions: `.pack` or `.bnk` | `base\sound\soundbanks\pc` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Config

Recognised when the archive contains a file with one of these extensions: `.local` or `.cfg`.

Installs to: `USER_DOCS\Saved Games\MachineGames\TheGreatCircle\base`

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file with the `.dat` extension.

Installs to: `ROAMINGAPPDATA\GSE Saves\2677660\remote\GAME-SLOT0`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Sounds

Recognised when the archive contains a file with one of these extensions: `.pack` or `.bnk`.

Installs to: `base\sound\soundbanks\pc`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

