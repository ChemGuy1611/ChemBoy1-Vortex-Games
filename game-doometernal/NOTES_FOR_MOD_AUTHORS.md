# Notes for Mod Authors - DOOM Eternal

Packaging rules for DOOM Eternal mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Rollback | a file or folder named `doometernalx64vk.exe` | - |
| Injector | a file or folder named `eternalmodmanager.exe` | - |
| Ktde | a file or folder named `keep the dead eternal - readme - install instructions.rtf` | - |
| Meathook | a file or folder named `xinput1_3.dll` | - |
| Zip Mod | - | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Rollback

Recognised when the archive contains a file or folder named `doometernalx64vk.exe`.

## Injector

Recognised when the archive contains a file or folder named `eternalmodmanager.exe`.

## Ktde

Recognised when the archive contains a file or folder named `keep the dead eternal - readme - install instructions.rtf`.

## Meathook

Recognised when the archive contains a file or folder named `xinput1_3.dll`.

## Zip Mod

Handled by the `testZipContent` installer. Inspect the extension source for the exact archive layout it expects.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

