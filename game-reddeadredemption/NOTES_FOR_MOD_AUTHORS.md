# Notes for Mod Authors - Red Dead Redemption

Packaging rules for Red Dead Redemption mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| ScriptHookRDR | a `dinput8.dll` file and a `scripthookrdr.dll` file | the game folder |
| kepmehz Mod Loader | a `kml.asi` file | the game folder |
| Magic-RDR | - | the game folder |
| MagicRDR Mod (Loose) | a `.wtd`, `.was`, `.dds`, `.mtl` or `.wsc` file | `MagicRDR_Mods` |
| RPF File | a `.rpf` file | `kml\rpf` |
| ASI Script / Plugin | a `.asi` file | the game folder |

Paths are relative to the game's install folder.

## ScriptHookRDR

Recognised when the archive contains a `dinput8.dll` file and a `scripthookrdr.dll` file.

Installs to: the game folder

## kepmehz Mod Loader

Recognised when the archive contains a `kml.asi` file.

Installs to: the game folder

## Magic-RDR

Handled by the `testMagic` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: the game folder

## MagicRDR Mod (Loose)

Recognised when the archive contains a `.wtd`, `.was`, `.dds`, `.mtl` or `.wsc` file.

Installs to: `MagicRDR_Mods`

## RPF File

Recognised when the archive contains a `.rpf` file.

Installs to: `kml\rpf`

## ASI Script / Plugin

Recognised when the archive contains a `.asi` file.

Installs to: the game folder

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
