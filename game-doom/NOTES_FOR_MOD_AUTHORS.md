# Notes for Mod Authors - DOOM (2016)

Packaging rules for DOOM (2016) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| DOOMModLoader | a `doommodloader.exe` file | the game folder |
| DOOMLauncher | a `doomlauncher.exe` file | the game folder |
| DOOM Legacy Mod | a `dinput8.dll` file | the game folder |
| Version Rollback Files | a `doomx64vk.exe` file | the game folder |

Paths are relative to the game's install folder.

## DOOMModLoader

Recognised when the archive contains a `doommodloader.exe` file.

Installs to: the game folder

## DOOMLauncher

Recognised when the archive contains a `doomlauncher.exe` file.

Installs to: the game folder

## DOOM Legacy Mod

Recognised when the archive contains a `dinput8.dll` file.

Installs to: the game folder

## Version Rollback Files

Recognised when the archive contains a `doomx64vk.exe` file.

Installs to: the game folder

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
