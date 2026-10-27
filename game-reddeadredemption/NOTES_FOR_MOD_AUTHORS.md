# Notes for Mod Authors - Red Dead Redemption

Packaging rules for Red Dead Redemption mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Scripthook | a `dinput8.dll` file and a `scripthookrdr.dll` file | the game folder |
| Modloader | a `kml.asi` file | the game folder |
| Magicrdr | - | the game folder |
| Magicmod | a `.wtd`, `.was`, `.dds`, `.mtl` or `.wsc` file | `MagicRDR_Mods` |
| Rpf | a `.rpf` file | `kml\rpf` |
| Asiplugin | a `.asi` file | the game folder |

Paths are relative to the game's install folder.

## Scripthook

Recognised when the archive contains a `dinput8.dll` file and a `scripthookrdr.dll` file.

Installs to: the game folder

## Modloader

Recognised when the archive contains a `kml.asi` file.

Installs to: the game folder

## Magicrdr

Handled by the `testMagic` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: the game folder

## Magicmod

Recognised when the archive contains a `.wtd`, `.was`, `.dds`, `.mtl` or `.wsc` file.

Installs to: `MagicRDR_Mods`

## Rpf

Recognised when the archive contains a `.rpf` file.

Installs to: `kml\rpf`

## Asiplugin

Recognised when the archive contains a `.asi` file.

Installs to: the game folder

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
