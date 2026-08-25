# Notes for Mod Authors - Battlefield 1

Packaging rules for Battlefield 1 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Frosty Mod Manager (tool) | a `frostymodmanager.exe` file | - |
| Masseffectandromeda Fbmod | a file with the `.fbmod` extension | - |

Paths are relative to the game's install folder.

## Frosty Mod Manager (tool)

This installer handles Frosty Mod Manager itself, not mods for it. It exists so users can install Frosty Mod Manager through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `frostymodmanager.exe` in the archive.

**Common mistakes:**

- If you bundle Frosty Mod Manager inside your mod archive, Vortex treats the whole download as Frosty Mod Manager rather than as your mod. Ship the mod alone and list Frosty Mod Manager as a requirement.

## Masseffectandromeda Fbmod

Recognised when the archive contains a file with the `.fbmod` extension.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

