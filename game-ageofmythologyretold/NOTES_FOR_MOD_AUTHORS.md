# Notes for Mod Authors - Age of Mythology: Retold

Packaging rules for Age of Mythology: Retold mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Save Game Files | a `.mythsav` file | `%USERPROFILE%\Games\Age of Mythology Retold\<User ID>\savegames` |
| Config File Mods | a `.xml` file | `%USERPROFILE%\Games\Age of Mythology Retold\<User ID>\users` |
| Reshade | a `reshade-shaders` folder | the game folder |
| Binaries / Root Game Folder | a `.dll` or `.ini` file | the game folder |

Paths are relative to the game's install folder. Config and save folders are in your user profile, not the game's install folder.

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file with the `.mythsav` extension.

Installs to: `%USERPROFILE%\Games\Age of Mythology Retold\<User ID>\savegames`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Config File Mods

Configuration tweaks, deployed to the game's config location.

**Requirements:**

- Recognised by any file with the `.xml` extension.

Installs to: `%USERPROFILE%\Games\Age of Mythology Retold\<User ID>\users`

**Common mistakes:**

- Shipping a config file with one of these names inside an unrelated mod makes the whole archive install as a config mod.

## Reshade

Recognised when the archive contains a `reshade-shaders` folder.

Installs to: the game folder

## Binaries / Root Game Folder

Recognised when the archive contains a `.dll` or `.ini` file.

Installs to: the game folder

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
