# Notes for Mod Authors - Deus Ex: Human Revolution

Packaging rules for Deus Ex: Human Revolution mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Mod .000 File | a `.000` file | `mods` |
| DXHR Patcher | a `DXHR-Patcher_1.5.jar` file | the game folder |
| DXHRDC-ModHook | a `DFEngine.dll` file | the game folder |

Paths are relative to the game's install folder.

## Mod .000 File

Recognised when the archive contains a `.000` file.

Installs to: `mods`

## DXHR Patcher

Recognised when the archive contains a `DXHR-Patcher_1.5.jar` file.

Installs to: the game folder

## DXHRDC-ModHook

Recognised when the archive contains a `DFEngine.dll` file.

Installs to: the game folder

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
