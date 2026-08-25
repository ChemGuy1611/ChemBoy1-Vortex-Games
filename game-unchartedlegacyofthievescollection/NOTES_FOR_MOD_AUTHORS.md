# Notes for Mod Authors - Uncharted: Legacy of Thieves Collection

Packaging rules for Uncharted: Legacy of Thieves Collection mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Fluffy Mod Manager (tool) | a `modmanager.exe` file | - |
| Psarc | a file with the `.psarc` extension | - |
| Fluffy-Format Mods | anything not matched above | - |

Paths are relative to the game's install folder.

## Fluffy Mod Manager (tool)

This installer handles Fluffy Mod Manager itself, not mods for it. It exists so users can install Fluffy Mod Manager through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `modmanager.exe` in the archive.

**Common mistakes:**

- If you bundle Fluffy Mod Manager inside your mod archive, Vortex treats the whole download as Fluffy Mod Manager rather than as your mod. Ship the mod alone and list Fluffy Mod Manager as a requirement.

## Psarc

Recognised when the archive contains a file with the `.psarc` extension.

## Fluffy-Format Mods

The catch-all for RE Engine mods packaged in the normal Fluffy Mod Manager layout. Most content mods for this game land here, which is the intended outcome.

**Requirements:**

- Any archive not claimed by an earlier installer is treated as a Fluffy-format mod.
- An archive already zipped in the Fluffy layout is installed as it is, with no repacking.

**Common mistakes:**

- Because this is a catch-all, a badly laid-out archive still installs - it just may not work. Match the layout Fluffy Mod Manager expects.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

