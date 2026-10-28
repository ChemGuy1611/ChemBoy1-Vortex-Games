# Notes for Mod Authors - DOOM: The Dark Ages

Packaging rules for DOOM: The Dark Ages mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Atlan Mod Loader | a `DarkAgesModManager.exe` file | the game folder |
| Atlan Resource Extractor | a `AtlanResourceExtractor.exe` file | the game folder |
| Valen | a `Valen.exe` file | the game folder |
| DarkAgesPatcher | a `DarkAgesPatcher.exe` file | the game folder |
| Sound | a `.snd` or `.pck` file | `base\sound\soundbanks\pc` |
| Config File Mods | a `.cfg` file | `base` |
| Zip Mod | a `darkagesmod.txt` file | - |
| Binaries / Root Folder | - | the game folder |

Paths are relative to the game's install folder. Config and save folders are in your user profile, not the game's install folder.

## Atlan Mod Loader

Recognised when the archive contains a `DarkAgesModManager.exe` file.

Installs to: the game folder

## Atlan Resource Extractor

Recognised when the archive contains a `AtlanResourceExtractor.exe` file.

Installs to: the game folder

## Valen

Recognised when the archive contains a `Valen.exe` file.

Installs to: the game folder

## DarkAgesPatcher

Recognised when the archive contains a `DarkAgesPatcher.exe` file.

Installs to: the game folder

## Sound

Recognised when the archive contains a `.snd` or `.pck` file.

Installs to: `base\sound\soundbanks\pc`

## Config File Mods

Configuration tweaks, deployed to the game's config location.

**Requirements:**

- Recognised by any file with the `.cfg` extension.

Installs to: `base`

**Common mistakes:**

- Shipping a config file with one of these names inside an unrelated mod makes the whole archive install as a config mod.

## Zip Mod

Recognised when the archive contains a `darkagesmod.txt` file.

## Binaries / Root Folder

Handled by the `testBinaries` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: the game folder

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
