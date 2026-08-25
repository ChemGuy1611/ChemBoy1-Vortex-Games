# Notes for Mod Authors - Final Fantasy XVI

Packaging rules for Final Fantasy XVI mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Reloaded-II (mod loader) | a `reloaded-ii.exe` file | - |
| Reloadedmod | a file or folder named `modconfig.json` | `Reloaded` |

Paths are relative to the game's install folder.

## Reloaded-II (mod loader)

This installer handles Reloaded-II itself, not mods for it. It exists so users can install Reloaded-II through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `reloaded-ii.exe` in the archive.

**Common mistakes:**

- If you bundle Reloaded-II inside your mod archive, Vortex treats the whole download as Reloaded-II rather than as your mod. Ship the mod alone and list Reloaded-II as a requirement.

## Reloadedmod

Recognised when the archive contains a file or folder named `modconfig.json`.

Installs to: `Reloaded`

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

