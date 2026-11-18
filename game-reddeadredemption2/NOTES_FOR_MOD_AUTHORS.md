# Notes for Mod Authors - Red Dead Redemption 2

Packaging rules for Red Dead Redemption 2 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Lenny's Mod Loader | a `vfs.asi` file | the game folder |
| ScriptHookRDR2 | a `scripthookrdr2.dll` or `dinput8.dll` file | the game folder |
| Root / Game Folder Mods | a `x64` or `lml` folder | the game folder |
| ASI Plugin | a `.asi` file | the game folder |
| LML Mod | a `install.xml` file and a `.ytd`, `.ydr`, `.ydd`, `.yft`, `.ymt`, `.ymap`, `.ytyp`, `.ybn`, `.awc`, `.meta`, `.ymf`, `.yld` or `.gxt2` file | `lml` |
| Fallback Installer | anything not matched above | the game folder |

Paths are relative to the game's install folder.

## Lenny's Mod Loader

Recognised when the archive contains a `vfs.asi` file.

Installs to: the game folder

## ScriptHookRDR2

Recognised when the archive contains a `scripthookrdr2.dll` or `dinput8.dll` file.

Installs to: the game folder

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── x64\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `x64` or `lml` in the archive.

Installs to: the game folder

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## ASI Plugin

Recognised when the archive contains a `.asi` file.

Installs to: the game folder

## LML Mod

Recognised when the archive contains a `install.xml` file and a `.ytd`, `.ydr`, `.ydd`, `.yft`, `.ymt`, `.ymap`, `.ytyp`, `.ybn`, `.awc`, `.meta`, `.ymf`, `.yld` or `.gxt2` file.

Installs to: `lml`

## Fallback Installer

The catch-all. Any archive that matched none of the installers above lands here and is copied across unchanged.

> **NOTE:** Landing in the fallback installer is a signal your archive layout needs fixing.

**Requirements:**

- Reaching this installer usually means the archive was not laid out in a way Vortex recognised.
- Vortex shows the user a notification when a mod installs through the fallback.

Installs to: the game folder

**Common mistakes:**

- If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report the mod as broken.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
