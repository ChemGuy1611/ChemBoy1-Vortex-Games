# Notes for Mod Authors - DOOM Eternal

Packaging rules for DOOM Eternal mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Rollback | a `doometernalx64vk.exe` file | the game folder |
| Injector | a `eternalmodmanager.exe` file | the game folder |
| Ktde | a `keep the dead eternal - readme - install instructions.rtf` file | the game folder |
| Meathook | a `xinput1_3.dll` file | the game folder |
| Zip Mod | - | - |

Paths are relative to the game's install folder.

## Rollback

Recognised when the archive contains a `doometernalx64vk.exe` file.

Installs to: the game folder

## Injector

Recognised when the archive contains a `eternalmodmanager.exe` file.

Installs to: the game folder

## Ktde

Recognised when the archive contains a `keep the dead eternal - readme - install instructions.rtf` file.

Installs to: the game folder

## Meathook

Recognised when the archive contains a `xinput1_3.dll` file.

Installs to: the game folder

## Zip Mod

Handled by the `testZipContent` installer. Inspect the extension source for the exact archive layout it expects.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
