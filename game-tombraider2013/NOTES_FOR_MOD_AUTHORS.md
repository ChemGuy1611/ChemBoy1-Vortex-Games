# Notes for Mod Authors - Tomb Raider (2013)

Packaging rules for Tomb Raider (2013) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Trmodmanager | a `trreboottools.modmanager.exe` file | the game folder |
| Texmod | a `texmod.exe` file | the game folder |
| Texmodpack | a `.tpf` file | `TexMod` |
| Managermod | a `.tr9dtp`, `.tr9material`, `.tr9modeldata`, `.t9script`, `.t9shaderlib`, `.tr9sound`, `.dds`, `.tr9objectref`, `.tr9dtp` or `.tr9anim` file | `Mods` |

Paths are relative to the game's install folder.

## Trmodmanager

Recognised when the archive contains a `trreboottools.modmanager.exe` file.

Installs to: the game folder

## Texmod

Recognised when the archive contains a `texmod.exe` file.

Installs to: the game folder

## Texmodpack

Recognised when the archive contains a `.tpf` file.

Installs to: `TexMod`

## Managermod

Recognised when the archive contains a `.tr9dtp`, `.tr9material`, `.tr9modeldata`, `.t9script`, `.t9shaderlib`, `.tr9sound`, `.dds`, `.tr9objectref`, `.tr9dtp` or `.tr9anim` file.

Installs to: `Mods`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
