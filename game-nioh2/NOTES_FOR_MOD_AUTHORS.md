# Notes for Mod Authors - Nioh 2

Packaging rules for Nioh 2 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Loader | a `d3d11.dll` file | the game folder |
| Mod | a `.ini` file and a `.fmt`, `.vb`, `.ib` or `.dds` file | `Mods` |
| Fallback Installer | anything not matched above | the game folder |

Paths are relative to the game's install folder.

## Loader

Recognised when the archive contains a `d3d11.dll` file.

Installs to: the game folder

## Mod

Recognised when the archive contains a `.ini` file and a `.fmt`, `.vb`, `.ib` or `.dds` file.

Installs to: `Mods`

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
