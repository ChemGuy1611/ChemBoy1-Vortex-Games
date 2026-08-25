# Notes for Mod Authors - Bloodborne

Packaging rules for Bloodborne mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Shadps4 | a file or folder named `shadps4.exe` | - |
| Shadlauncher | a file or folder named `shadps4qtlauncher.exe` | - |
| Smithbox | a file or folder named `smithbox.exe` | - |
| Flver | a file or folder named `flver_editor.exe` | - |
| Dvdroot Ps4 | a file or folder named one of: `action`, `chr`, `event`, `facegen`, `map`, `menu`, `movie`, `msg`, `mtd`, `obj`, `other`, `param`, `paramdef`, `parts`, `remo`, `script`, `sfx`, `shader` or `sound` | `CUSA03173\dvdroot_ps4` |
| Save | a file or folder named `userdata0000` | `user\savedata\1\CUSA03173\SPRJ0005` |

Paths are relative to the game's install folder.

## Shadps4

Recognised when the archive contains a file or folder named `shadps4.exe`.

## Shadlauncher

Recognised when the archive contains a file or folder named `shadps4qtlauncher.exe`.

## Smithbox

Recognised when the archive contains a file or folder named `smithbox.exe`.

## Flver

Recognised when the archive contains a file or folder named `flver_editor.exe`.

## Dvdroot Ps4

Recognised when the archive contains a file or folder named one of: `action`, `chr`, `event`, `facegen`, `map`, `menu`, `movie`, `msg`, `mtd`, `obj`, `other`, `param`, `paramdef`, `parts`, `remo`, `script`, `sfx`, `shader` or `sound`.

Installs to: `CUSA03173\dvdroot_ps4`

## Save

Recognised when the archive contains a file or folder named `userdata0000`.

Installs to: `user\savedata\1\CUSA03173\SPRJ0005`

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

