# Notes for Mod Authors - DOOM: The Dark Ages

Packaging rules for DOOM: The Dark Ages mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Modmanager | a file or folder named `DarkAgesModManager.exe` | - |
| Atlanextractor | a file or folder named `AtlanResourceExtractor.exe` | - |
| Valen | a file or folder named `Valen.exe` | - |
| Patcher | a file or folder named `DarkAgesPatcher.exe` | - |
| Sound | a file with one of these extensions: `.snd` or `.pck` | `base\sound\soundbanks\pc` |
| Config | a file with one of these extensions: `.cfg` | `base` |
| Zipmod | a file or folder named `darkagesmod.txt` | - |
| Binaries | - | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Modmanager

Recognised when the archive contains a file or folder named `DarkAgesModManager.exe`.

## Atlanextractor

Recognised when the archive contains a file or folder named `AtlanResourceExtractor.exe`.

## Valen

Recognised when the archive contains a file or folder named `Valen.exe`.

## Patcher

Recognised when the archive contains a file or folder named `DarkAgesPatcher.exe`.

## Sound

Recognised when the archive contains a file with one of these extensions: `.snd` or `.pck`.

Installs to: `base\sound\soundbanks\pc`

## Config

Recognised when the archive contains a file with one of these extensions: `.cfg`.

Installs to: `base`

## Zipmod

Recognised when the archive contains a file or folder named `darkagesmod.txt`.

## Binaries

Handled by the `testBinaries` installer. Inspect the extension source for the exact archive layout it expects.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

