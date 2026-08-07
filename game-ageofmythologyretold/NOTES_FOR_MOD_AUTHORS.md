# Notes for Mod Authors - Age of Mythology: Retold

Packaging rules for Age of Mythology: Retold mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Save Game Files | a `.mythsav` file | `util.getVortexPath('home')\Games\Age of Mythology Retold\USERID_FOLDER\savegames` |
| Config | a file or folder named `game` and a file with the `.xml` extension | `util.getVortexPath('home')\Games\Age of Mythology Retold\USERID_FOLDER\users` |
| Reshade | a file or folder named `reshade-shaders` | - |
| Binaries | a file with one of these extensions: `.dll` or `.ini` | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file with the `.mythsav` extension.

Installs to: `util.getVortexPath('home')\Games\Age of Mythology Retold\USERID_FOLDER\savegames`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Config

Recognised when the archive contains a file or folder named `game` and a file with the `.xml` extension.

Installs to: `util.getVortexPath('home')\Games\Age of Mythology Retold\USERID_FOLDER\users`

## Reshade

Recognised when the archive contains a file or folder named `reshade-shaders`.

## Binaries

Recognised when the archive contains a file with one of these extensions: `.dll` or `.ini`.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

