# Notes for Mod Authors - Rise of the Tomb Raider

Packaging rules for Rise of the Tomb Raider mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Manager | a file or folder named `rottrmodmanager.exe` | - |
| Trmodmanager | a file or folder named `trreboottools.modmanager.exe` | - |
| Binaries | a file with one of these extensions: `.dll`, `.exe`, `.tiger`, `.asi` or `.addon64` | - |
| Modmanagermod | a file with one of these extensions: `tr2mesh`, `.tr2pcd`, `.drm`, `.skl`, `.tr10dtp`, `.tr10material`, `.tr10modeldata`, `.t10script`, `.t10shaderlib`, `.tr10sound`, `.dds`, `.tr10objectref`, `.tr10dtp` or `.tr10anim` | `Mods` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Manager

Recognised when the archive contains a file or folder named `rottrmodmanager.exe`.

## Trmodmanager

Recognised when the archive contains a file or folder named `trreboottools.modmanager.exe`.

## Binaries

Recognised when the archive contains a file with one of these extensions: `.dll`, `.exe`, `.tiger`, `.asi` or `.addon64`.

## Modmanagermod

Recognised when the archive contains a file with one of these extensions: `tr2mesh`, `.tr2pcd`, `.drm`, `.skl`, `.tr10dtp`, `.tr10material`, `.tr10modeldata`, `.t10script`, `.t10shaderlib`, `.tr10sound`, `.dds`, `.tr10objectref`, `.tr10dtp` or `.tr10anim`.

Installs to: `Mods`

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

