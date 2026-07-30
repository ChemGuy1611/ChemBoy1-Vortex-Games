# Notes for Mod Authors - Marvel's Spider-Man 2

Packaging rules for Marvel's Spider-Man 2 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Overstrike | a file or folder named `overstrike.exe` | - |
| Osmod | a file with one of these extensions: `.smpcmod`, `.suit`, `.suit_style`, `.stage`, `.modular` or `.script` | `Mods Library` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Overstrike

Recognised when the archive contains a file or folder named `overstrike.exe`.

## Osmod

Recognised when the archive contains a file with one of these extensions: `.smpcmod`, `.suit`, `.suit_style`, `.stage`, `.modular` or `.script`.

Installs to: `Mods Library`

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

