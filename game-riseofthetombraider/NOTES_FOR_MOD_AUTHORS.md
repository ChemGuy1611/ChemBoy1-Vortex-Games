# Notes for Mod Authors - Rise of the Tomb Raider

Packaging rules for Rise of the Tomb Raider mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Manager | a `rottrmodmanager.exe` file | the game folder |
| Trmodmanager | a `trreboottools.modmanager.exe` file | the game folder |
| Binaries | a `.dll`, `.exe`, `.tiger`, `.asi` or `.addon64` file | the game folder |
| Modmanagermod | a `tr2mesh`, `.tr2pcd`, `.drm`, `.skl`, `.tr10dtp`, `.tr10material`, `.tr10modeldata`, `.t10script`, `.t10shaderlib`, `.tr10sound`, `.dds`, `.tr10objectref`, `.tr10dtp` or `.tr10anim` file | `Mods` |

Paths are relative to the game's install folder.

## Manager

Recognised when the archive contains a `rottrmodmanager.exe` file.

Installs to: the game folder

## Trmodmanager

Recognised when the archive contains a `trreboottools.modmanager.exe` file.

Installs to: the game folder

## Binaries

Recognised when the archive contains a `.dll`, `.exe`, `.tiger`, `.asi` or `.addon64` file.

Installs to: the game folder

## Modmanagermod

Recognised when the archive contains a `tr2mesh`, `.tr2pcd`, `.drm`, `.skl`, `.tr10dtp`, `.tr10material`, `.tr10modeldata`, `.t10script`, `.t10shaderlib`, `.tr10sound`, `.dds`, `.tr10objectref`, `.tr10dtp` or `.tr10anim` file.

Installs to: `Mods`

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
