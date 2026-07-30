# Notes for Mod Authors - Horizon Forbidden West

Packaging rules for Horizon Forbidden West mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Save Game Files | a `.dat` file | `userDocsPathString\Horizon Forbidden West Complete Edition\USERID_FOLDER` |
| Managermod | a file or folder named one of: `modinfo.json` and a file with one of these extensions: `.core` or `.stream` | `mods` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file with the `.dat` extension.

Installs to: `userDocsPathString\Horizon Forbidden West Complete Edition\USERID_FOLDER`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Managermod

Recognised when the archive contains a file or folder named one of: `modinfo.json` and a file with one of these extensions: `.core` or `.stream`.

Installs to: `mods`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

