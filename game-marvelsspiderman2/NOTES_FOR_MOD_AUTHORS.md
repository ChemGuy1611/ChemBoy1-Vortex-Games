# Notes for Mod Authors - Marvel's Spider-Man 2

Packaging rules for Marvel's Spider-Man 2 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Overstrike | a `overstrike.exe` file | the game folder |
| Overstrike Mod | a `.smpcmod`, `.suit`, `.suit_style`, `.stage`, `.modular` or `.script` file | `Mods Library` |

Paths are relative to the game's install folder.

## Overstrike

Recognised when the archive contains a `overstrike.exe` file.

Installs to: the game folder

## Overstrike Mod

Recognised when the archive contains a `.smpcmod`, `.suit`, `.suit_style`, `.stage`, `.modular` or `.script` file.

Installs to: `Mods Library`

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
