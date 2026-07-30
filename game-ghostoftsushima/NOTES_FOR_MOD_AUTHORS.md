# Notes for Mod Authors - Ghost of Tsushima

Packaging rules for Ghost of Tsushima mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Psarc | a file with the `.psarc` extension | `cache_pc\psarc` |
| Save Game Files | a `.sav` file | `userDocsPathString\Ghost of Tsushima DIRECTOR'S CUT\USERID_FOLDER` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Psarc

Recognised when the archive contains a file with the `.psarc` extension.

Installs to: `cache_pc\psarc`

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file with the `.sav` extension.

Installs to: `userDocsPathString\Ghost of Tsushima DIRECTOR'S CUT\USERID_FOLDER`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

