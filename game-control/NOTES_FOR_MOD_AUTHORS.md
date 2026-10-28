# Notes for Mod Authors - Control

Packaging rules for Control mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Mod Folder | a `data_packfiles`, `data`, `data_pc` or `plugins` folder | the game folder |
| Mod Files (data_packfiles) | a `.bin`, `.packmeta` or `.rmdp` file | `data_packfiles` |
| Loose File Loader | a `iphlpapi.dll` file | the game folder |
| Plugin Loader | a `xinput1_4.dll` file | the game folder |

Paths are relative to the game's install folder.

## Mod Folder

Recognised when the archive contains a `data_packfiles`, `data`, `data_pc` or `plugins` folder.

Installs to: the game folder

## Mod Files (data_packfiles)

Recognised when the archive contains a `.bin`, `.packmeta` or `.rmdp` file.

Installs to: `data_packfiles`

## Loose File Loader

Recognised when the archive contains a `iphlpapi.dll` file.

Installs to: the game folder

## Plugin Loader

Recognised when the archive contains a `xinput1_4.dll` file.

Installs to: the game folder

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
