# Notes for Mod Authors - PEAK

Packaging rules for PEAK mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| BepInEx Configuration Manager | a `configurationmanager.dll` file | `Bepinex` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## BepInEx Configuration Manager

This installer handles the BepInEx Configuration Manager plugin itself, not mods for it. It exists so users can install the BepInEx Configuration Manager plugin through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `configurationmanager.dll` in the archive.
- Requires the file `configurationmanager.dll` together with a `plugins` folder.

Installs to: `Bepinex`

**Common mistakes:**

- If you bundle the BepInEx Configuration Manager plugin inside your mod archive, Vortex treats the whole download as the BepInEx Configuration Manager plugin rather than as your mod. Ship the mod alone and list the BepInEx Configuration Manager plugin as a requirement.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

