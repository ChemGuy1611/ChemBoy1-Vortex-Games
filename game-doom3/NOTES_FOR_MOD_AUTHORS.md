# Notes for Mod Authors - DOOM 3 & DOOM 3: BFG Edition

Packaging rules for DOOM 3 & DOOM 3: BFG Edition mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Dhewm3 | a file or folder named `dhewm3.exe` | - |
| Bfgedition Root | a file or folder named one of: `base` | - |
| Root / Game Folder Mods | a `base` file | the game folder itself (no subfolder) |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Dhewm3

Recognised when the archive contains a file or folder named `dhewm3.exe`.

## Bfgedition Root

Recognised when the archive contains a file or folder named one of: `base`.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

**Requirements:**

- Recognised by any file named `base`, `d3xp`, `d3le`, `tfphobos`, `womd_readme.txt`, `d3hdpack`, `arl`, `redux 20th anniversary edition rc1` or `installation`.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

