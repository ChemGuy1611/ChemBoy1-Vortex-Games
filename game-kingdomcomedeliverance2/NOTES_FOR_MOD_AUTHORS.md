# Notes for Mod Authors - Kingdom Come Deliverance II

Packaging rules for Kingdom Come Deliverance II mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Mod | a file or folder named `mod.cfg`, a file or folder named one of: `mod.manifest` and a file or folder named one of: `data`, `localization`, `engine` or `KCSE` | - |
| Root / Game Folder Mods | a `bin` folder | the game folder itself (no subfolder) |
| Cfg | a file with the `.cfg` extension | - |
| Binaries | a file with the `.dll` extension and a file with the `.exe` extension | - |
| Fallback Installer | anything not matched above | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Mod

Recognised when the archive contains a file or folder named `mod.cfg`, a file or folder named one of: `mod.manifest` and a file or folder named one of: `data`, `localization`, `engine` or `KCSE`.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── bin\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `bin` or `KCSE` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Cfg

Recognised when the archive contains a file with the `.cfg` extension.

## Binaries

Recognised when the archive contains a file with the `.dll` extension and a file with the `.exe` extension.

## Fallback Installer

The catch-all. Any archive that matched none of the installers above lands here and is copied across unchanged.

> **NOTE:** Landing in the fallback installer is a signal your archive layout needs fixing.

**Requirements:**

- Reaching this installer usually means the archive was not laid out in a way Vortex recognised.
- Vortex shows the user a notification when a mod installs through the fallback.

**Common mistakes:**

- If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report the mod as broken.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

