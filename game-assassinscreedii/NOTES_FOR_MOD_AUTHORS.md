# Notes for Mod Authors - AC II

Packaging rules for AC II mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| AnvilToolkit (tool) | a `anviltoolkit.exe` file | - |

Paths are relative to the game's install folder.

## AnvilToolkit (tool)

This installer handles AnvilToolkit itself, not mods for it. It exists so users can install AnvilToolkit through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `anviltoolkit.exe` in the archive.

**Common mistakes:**

- If you bundle AnvilToolkit inside your mod archive, Vortex treats the whole download as AnvilToolkit rather than as your mod. Ship the mod alone and list AnvilToolkit as a requirement.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

