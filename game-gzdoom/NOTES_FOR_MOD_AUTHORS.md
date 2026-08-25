# Notes for Mod Authors - Doom I & II (UZDoom)

Packaging rules for Doom I & II (UZDoom) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Dml | - | `DML` |
| Gzdoom | a file or folder named `uzdoom.exe` | `DML\FILE\PORT\gzdoom` |
| Wad | a file or folder named one of: `doom.wad`, `doom2.wad`, `freedoom.wad` or `nerve.wad` and a file with one of these extensions: `.iwad` or `.ipk3` | `DML\FILE\IWAD` |
| Mod | a file with one of these extensions: `.wad`, `.pk3`, `.zip`, `.pak`, `.pk7`, `.grp`, `.rff`, `.deh`, `.iwad` or `.ipk3` | `DML\FILE\PWAD` |
| Zipmod | - | - |

Paths are relative to the game's install folder.

## Dml

Handled by the `testDML` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: `DML`

## Gzdoom

Recognised when the archive contains a file or folder named `uzdoom.exe`.

Installs to: `DML\FILE\PORT\gzdoom`

## Wad

Recognised when the archive contains a file or folder named one of: `doom.wad`, `doom2.wad`, `freedoom.wad` or `nerve.wad` and a file with one of these extensions: `.iwad` or `.ipk3`.

Installs to: `DML\FILE\IWAD`

## Mod

Recognised when the archive contains a file with one of these extensions: `.wad`, `.pk3`, `.zip`, `.pak`, `.pk7`, `.grp`, `.rff`, `.deh`, `.iwad` or `.ipk3`.

Installs to: `DML\FILE\PWAD`

## Zipmod

Handled by the `testZipContent` installer. Inspect the extension source for the exact archive layout it expects.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

