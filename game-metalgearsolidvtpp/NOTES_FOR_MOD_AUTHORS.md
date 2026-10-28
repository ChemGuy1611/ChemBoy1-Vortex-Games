# Notes for Mod Authors - METAL GEAR SOLID V: THE PHANTOM PAIN

Packaging rules for METAL GEAR SOLID V: THE PHANTOM PAIN mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Snakebite Mod Manager | a `SnakeBite Installer.exe` file | the game folder |
| MGSVFix | a `mgsvfix.asi` file | the game folder |
| Root / Game Folder Mods | a `master` folder | the game folder |
| SnakeBite Mod (.mgsv) | a `.mgsv` or `.MGSVPreset` file | `SnakeBite_Mods` |

Paths are relative to the game's install folder.

## Snakebite Mod Manager

Recognised when the archive contains a `SnakeBite Installer.exe` file.

Installs to: the game folder

## MGSVFix

Recognised when the archive contains a `mgsvfix.asi` file.

Installs to: the game folder

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── master\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `master` in the archive.

Installs to: the game folder

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## SnakeBite Mod (.mgsv)

Recognised when the archive contains a `.mgsv` or `.MGSVPreset` file.

Installs to: `SnakeBite_Mods`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
