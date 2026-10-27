# Notes for Mod Authors - Bloodborne

Packaging rules for Bloodborne mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Shadps4 | a `shadps4.exe` file | the game folder |
| Shadlauncher | a `shadps4qtlauncher.exe` file | the game folder |
| Smithbox | a `smithbox.exe` file | the game folder |
| Flver | a `flver_editor.exe` file | the game folder |
| Dvdroot Ps4 | a `action`, `chr`, `event`, `facegen`, `map`, `menu`, `movie`, `msg`, `mtd`, `obj`, `other`, `param`, `paramdef`, `parts`, `remo`, `script`, `sfx`, `shader` or `sound` folder | `CUSA03173\dvdroot_ps4` |
| Save Game Files | a `userdata0000` file | `user\savedata\1\CUSA03173\SPRJ0005` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Shadps4

Recognised when the archive contains a `shadps4.exe` file.

Installs to: the game folder

## Shadlauncher

Recognised when the archive contains a `shadps4qtlauncher.exe` file.

Installs to: the game folder

## Smithbox

Recognised when the archive contains a `smithbox.exe` file.

Installs to: the game folder

## Flver

Recognised when the archive contains a `flver_editor.exe` file.

Installs to: the game folder

## Dvdroot Ps4

Recognised when the archive contains a `action`, `chr`, `event`, `facegen`, `map`, `menu`, `movie`, `msg`, `mtd`, `obj`, `other`, `param`, `paramdef`, `parts`, `remo`, `script`, `sfx`, `shader` or `sound` folder.

Installs to: `CUSA03173\dvdroot_ps4`

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file named `userdata0000`.

Installs to: `user\savedata\1\CUSA03173\SPRJ0005`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
