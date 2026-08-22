# Notes for Mod Authors - METAL GEAR SOLID V: THE PHANTOM PAIN

Packaging rules for METAL GEAR SOLID V: THE PHANTOM PAIN mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Loader | a file or folder named `SnakeBite Installer.exe` | - |
| Mgsvfix | a file or folder named one of: `mgsvfix.asi` | - |
| Root / Game Folder Mods | a `master` folder | the game folder itself (no subfolder) |
| Mod | a file with one of these extensions: `.mgsv` | `SnakeBite_Mods` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Loader

Recognised when the archive contains a file or folder named `SnakeBite Installer.exe`.

## Mgsvfix

Recognised when the archive contains a file or folder named one of: `mgsvfix.asi`.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── master\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `master` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Mod

Recognised when the archive contains a file with one of these extensions: `.mgsv`.

Installs to: `SnakeBite_Mods`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

