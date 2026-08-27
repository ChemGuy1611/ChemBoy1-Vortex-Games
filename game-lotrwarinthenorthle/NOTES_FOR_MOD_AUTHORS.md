# Notes for Mod Authors - The Lord of the Rings: War in the North - Legacy Edition

Packaging rules for The Lord of the Rings: War in the North - Legacy Edition mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Root | - | - |
| Fallback | - | - |

Paths are relative to the game's install folder.

## Root

Handled by the `testRoot` installer. Inspect the extension source for the exact archive layout it expects.

## Fallback

Handled by the `testFallback` installer. Inspect the extension source for the exact archive layout it expects.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

