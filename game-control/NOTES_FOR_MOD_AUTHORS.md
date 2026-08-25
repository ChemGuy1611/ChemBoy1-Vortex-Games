# Notes for Mod Authors - Control

Packaging rules for Control mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Modfolder | a file or folder named one of: `data_packfiles`, `data`, `data_pc` or `plugins` | - |
| Modpack | a file with one of these extensions: `.bin`, `.packmeta` or `.rmdp` | `data_packfiles` |
| Loosefileloader | a file or folder named `iphlpapi.dll` | - |
| Pluginloader | a file or folder named `xinput1_4.dll` | - |

Paths are relative to the game's install folder.

## Modfolder

Recognised when the archive contains a file or folder named one of: `data_packfiles`, `data`, `data_pc` or `plugins`.

## Modpack

Recognised when the archive contains a file with one of these extensions: `.bin`, `.packmeta` or `.rmdp`.

Installs to: `data_packfiles`

## Loosefileloader

Recognised when the archive contains a file or folder named `iphlpapi.dll`.

## Pluginloader

Recognised when the archive contains a file or folder named `xinput1_4.dll`.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

