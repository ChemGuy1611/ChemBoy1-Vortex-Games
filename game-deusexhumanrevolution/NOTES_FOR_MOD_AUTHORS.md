# Notes for Mod Authors - Deus Ex: Human Revolution

Packaging rules for Deus Ex: Human Revolution mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Mod000 | a file with the `.000` extension | `mods` |
| Patcher | a file or folder named `DXHR-Patcher_1.5.jar` | the game folder itself (no subfolder) |
| Modhook | a file or folder named `DFEngine.dll` | the game folder itself (no subfolder) |

Paths are relative to the game's install folder.

## Mod000

Recognised when the archive contains a file with the `.000` extension.

Installs to: `mods`

## Patcher

Recognised when the archive contains a file or folder named `DXHR-Patcher_1.5.jar`.

Installs to: the game folder itself (no subfolder)

## Modhook

Recognised when the archive contains a file or folder named `DFEngine.dll`.

Installs to: the game folder itself (no subfolder)

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

