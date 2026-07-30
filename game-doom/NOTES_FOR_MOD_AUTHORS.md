# Notes for Mod Authors - DOOM (2016)

Packaging rules for DOOM (2016) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Modloader | a file or folder named `doommodloader.exe` | - |
| Launcher | a file or folder named `doomlauncher.exe` | - |
| Legacy | a file or folder named `dinput8.dll` | - |
| Rollback | a file or folder named `doomx64vk.exe` | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Modloader

Recognised when the archive contains a file or folder named `doommodloader.exe`.

## Launcher

Recognised when the archive contains a file or folder named `doomlauncher.exe`.

## Legacy

Recognised when the archive contains a file or folder named `dinput8.dll`.

## Rollback

Recognised when the archive contains a file or folder named `doomx64vk.exe`.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

