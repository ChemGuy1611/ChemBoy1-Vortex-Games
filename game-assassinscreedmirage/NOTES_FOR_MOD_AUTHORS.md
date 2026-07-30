# Notes for Mod Authors - AC Mirage

Packaging rules for AC Mirage mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| AnvilToolkit (tool) | a `anviltoolkit.exe` file | - |
| Forger | a file with the `.forger2` extension | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## AnvilToolkit (tool)

This installer handles AnvilToolkit itself, not mods for it. It exists so users can install AnvilToolkit through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `anviltoolkit.exe` in the archive.

**Common mistakes:**

- If you bundle AnvilToolkit inside your mod archive, Vortex treats the whole download as AnvilToolkit rather than as your mod. Ship the mod alone and list AnvilToolkit as a requirement.

## Forger

Recognised when the archive contains a file with the `.forger2` extension.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

