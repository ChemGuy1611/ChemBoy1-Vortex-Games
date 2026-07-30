# Notes for Mod Authors - Road to Vostok

Packaging rules for Road to Vostok mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Godotmodloader | a file or folder named `modloader.gd` | - |
| Mcm | a file or folder named `ModConfigurationMenu` | `mods` |
| Mod | a file with one of these extensions: `.vmz` | `mods` |
| Mod Rezip | a file or folder named one of: `mod.txt` | - |
| Fallback Installer | anything not matched above | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Godotmodloader

Recognised when the archive contains a file or folder named `modloader.gd`.

## Mcm

Recognised when the archive contains a file or folder named `ModConfigurationMenu`.

Installs to: `mods`

## Mod

Recognised when the archive contains a file with one of these extensions: `.vmz`.

Installs to: `mods`

## Mod Rezip

Recognised when the archive contains a file or folder named one of: `mod.txt`.

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

