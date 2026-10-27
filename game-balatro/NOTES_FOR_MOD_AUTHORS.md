# Notes for Mod Authors - Balatro

Packaging rules for Balatro mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| LOVELY | a `winmm.dll` file | the game folder |
| Steammodded | a `tk_debug_window.py` file | `%APPDATA%\Balatro\Mods` |
| Malverk | a `malverk.lua` file | `%APPDATA%\Balatro\Mods` |
| Mod | a `.lua` file and a `assets`, `libs`, `localization`, `lovely`, `lsp_def`, `api` or `utils` folder | - |

Paths are relative to the game's install folder.

## LOVELY

Recognised when the archive contains a `winmm.dll` file.

Installs to: the game folder

## Steammodded

Recognised when the archive contains a `tk_debug_window.py` file.

Installs to: `%APPDATA%\Balatro\Mods`

## Malverk

Recognised when the archive contains a `malverk.lua` file.

Installs to: `%APPDATA%\Balatro\Mods`

## Mod

Recognised when the archive contains a `.lua` file and a `assets`, `libs`, `localization`, `lovely`, `lsp_def`, `api` or `utils` folder.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
