# Notes for Mod Authors - Shadow of the Tomb Raider

Packaging rules for Shadow of the Tomb Raider mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Manager | a file or folder named `sottrmodmanager.exe` | - |
| Trmodmanager | a file or folder named `trreboottools.modmanager.exe` | - |
| Binaries | a file with one of these extensions: `.dll`, `.exe`, `.tiger`, `.asi` or `.addon64` | - |
| Modmanagermod | a file with one of these extensions: `.tr11dtp`, `.tr11material`, `.tr11modeldata`, `.t11script`, `.t11shaderlib`, `.tr11sound`, `.dds`, `.tr11objectref`, `.tr11dtp` or `.tr11anim` | `Mods` |

Paths are relative to the game's install folder.

## Manager

Recognised when the archive contains a file or folder named `sottrmodmanager.exe`.

## Trmodmanager

Recognised when the archive contains a file or folder named `trreboottools.modmanager.exe`.

## Binaries

Recognised when the archive contains a file with one of these extensions: `.dll`, `.exe`, `.tiger`, `.asi` or `.addon64`.

## Modmanagermod

Recognised when the archive contains a file with one of these extensions: `.tr11dtp`, `.tr11material`, `.tr11modeldata`, `.t11script`, `.t11shaderlib`, `.tr11sound`, `.dds`, `.tr11objectref`, `.tr11dtp` or `.tr11anim`.

Installs to: `Mods`

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

