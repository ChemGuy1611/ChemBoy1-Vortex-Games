# Notes for Mod Authors - Red Dead Redemption

Packaging rules for Red Dead Redemption mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Scripthook | a file or folder named `dinput8.dll` and a file or folder named `scripthookrdr.dll` | - |
| Modloader | a file or folder named `kml.asi` | - |
| Magicrdr | - | - |
| Magicmod | a file with one of these extensions: `.wtd`, `.was`, `.dds`, `.mtl` or `.wsc` | `MagicRDR_Mods` |
| Rpf | a file with the `.rpf` extension | `kml\rpf` |
| Asiplugin | a file with the `.asi` extension | - |

Paths are relative to the game's install folder.

## Scripthook

Recognised when the archive contains a file or folder named `dinput8.dll` and a file or folder named `scripthookrdr.dll`.

## Modloader

Recognised when the archive contains a file or folder named `kml.asi`.

## Magicrdr

Handled by the `testMagic` installer. Inspect the extension source for the exact archive layout it expects.

## Magicmod

Recognised when the archive contains a file with one of these extensions: `.wtd`, `.was`, `.dds`, `.mtl` or `.wsc`.

Installs to: `MagicRDR_Mods`

## Rpf

Recognised when the archive contains a file with the `.rpf` extension.

Installs to: `kml\rpf`

## Asiplugin

Recognised when the archive contains a file with the `.asi` extension.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

