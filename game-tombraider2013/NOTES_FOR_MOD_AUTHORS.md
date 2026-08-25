# Notes for Mod Authors - Tomb Raider (2013)

Packaging rules for Tomb Raider (2013) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Trmodmanager | a file or folder named `trreboottools.modmanager.exe` | - |
| Texmod | a file or folder named `texmod.exe` | - |
| Texmodpack | a file with the `.tpf` extension | `TexMod` |
| Managermod | a file with one of these extensions: `.tr9dtp`, `.tr9material`, `.tr9modeldata`, `.t9script`, `.t9shaderlib`, `.tr9sound`, `.dds`, `.tr9objectref`, `.tr9dtp` or `.tr9anim` | `Mods` |

Paths are relative to the game's install folder.

## Trmodmanager

Recognised when the archive contains a file or folder named `trreboottools.modmanager.exe`.

## Texmod

Recognised when the archive contains a file or folder named `texmod.exe`.

## Texmodpack

Recognised when the archive contains a file with the `.tpf` extension.

Installs to: `TexMod`

## Managermod

Recognised when the archive contains a file with one of these extensions: `.tr9dtp`, `.tr9material`, `.tr9modeldata`, `.t9script`, `.t9shaderlib`, `.tr9sound`, `.dds`, `.tr9objectref`, `.tr9dtp` or `.tr9anim`.

Installs to: `Mods`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

