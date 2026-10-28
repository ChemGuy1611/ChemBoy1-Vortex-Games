# Notes for Mod Authors - Shadow of the Tomb Raider

Packaging rules for Shadow of the Tomb Raider mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| SOTTR Mod Manager | a `sottrmodmanager.exe` file | the game folder |
| TR Reboot Mod Manager | a `trreboottools.modmanager.exe` file | the game folder |
| Binaries / Root Folder | a `.dll`, `.exe`, `.tiger`, `.asi` or `.addon64` file | the game folder |
| Mod Manager Mod | a `.tr11dtp`, `.tr11material`, `.tr11modeldata`, `.t11script`, `.t11shaderlib`, `.tr11sound`, `.dds`, `.tr11objectref`, `.tr11dtp` or `.tr11anim` file | `Mods` |

Paths are relative to the game's install folder.

## SOTTR Mod Manager

Recognised when the archive contains a `sottrmodmanager.exe` file.

Installs to: the game folder

## TR Reboot Mod Manager

Recognised when the archive contains a `trreboottools.modmanager.exe` file.

Installs to: the game folder

## Binaries / Root Folder

Recognised when the archive contains a `.dll`, `.exe`, `.tiger`, `.asi` or `.addon64` file.

Installs to: the game folder

## Mod Manager Mod

Recognised when the archive contains a `.tr11dtp`, `.tr11material`, `.tr11modeldata`, `.t11script`, `.t11shaderlib`, `.tr11sound`, `.dds`, `.tr11objectref`, `.tr11dtp` or `.tr11anim` file.

Installs to: `Mods`

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
