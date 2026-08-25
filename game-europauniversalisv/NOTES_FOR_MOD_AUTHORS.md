# Notes for Mod Authors - Europa Universalis V

Packaging rules for Europa Universalis V mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Mod | a file or folder named one of: `in_game`, `main_menu` or `loading_screen` | `game\mod` |
| Root / Game Folder Mods | a `game` folder | the game folder itself (no subfolder) |

Paths are relative to the game's install folder.

## Mod

Recognised when the archive contains a file or folder named one of: `in_game`, `main_menu` or `loading_screen`.

Installs to: `game\mod`

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── game\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `game` or `binaries` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

