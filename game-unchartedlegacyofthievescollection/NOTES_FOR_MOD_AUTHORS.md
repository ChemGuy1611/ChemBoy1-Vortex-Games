# Notes for Mod Authors - Uncharted: Legacy of Thieves Collection

Packaging rules for Uncharted: Legacy of Thieves Collection mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Fluffy Mod Manager (tool) | a `modmanager.exe` file | - |
| Psarc | a file with the `.psarc` extension | - |
| Mods | a file or folder named `modmanager.exe` | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Fluffy Mod Manager (tool)

This installer handles Fluffy Mod Manager itself, not mods for it. It exists so users can install Fluffy Mod Manager through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `modmanager.exe` in the archive.

**Common mistakes:**

- If you bundle Fluffy Mod Manager inside your mod archive, Vortex treats the whole download as Fluffy Mod Manager rather than as your mod. Ship the mod alone and list Fluffy Mod Manager as a requirement.

## Psarc

Recognised when the archive contains a file with the `.psarc` extension.

## Mods

Recognised when the archive contains a file or folder named `modmanager.exe`.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

