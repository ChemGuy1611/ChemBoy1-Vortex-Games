# Notes for Mod Authors - template-reloaded2 (template)

Packaging rules for template-reloaded2 (template) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Reloaded-II (mod loader) | a `reloaded-ii.exe` file | - |
| XXX Reloadedmodloader | a file or folder named `modconfig.json` and a file or folder named `XXX.modloader.dll` | `Reloaded\Mods\XXX_Mod_Loader` |
| XXX Reloadedmod | a file or folder named `modconfig.json` | `Reloaded\Mods` |
| Fallback Installer | anything not matched above | - |

Paths are relative to the game's install folder.

## Reloaded-II (mod loader)

This installer handles Reloaded-II itself, not mods for it. It exists so users can install Reloaded-II through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `reloaded-ii.exe` in the archive.

**Common mistakes:**

- If you bundle Reloaded-II inside your mod archive, Vortex treats the whole download as Reloaded-II rather than as your mod. Ship the mod alone and list Reloaded-II as a requirement.

## XXX Reloadedmodloader

Recognised when the archive contains a file or folder named `modconfig.json` and a file or folder named `XXX.modloader.dll`.

Installs to: `Reloaded\Mods\XXX_Mod_Loader`

## XXX Reloadedmod

Recognised when the archive contains a file or folder named `modconfig.json`.

Installs to: `Reloaded\Mods`

## Fallback Installer

The catch-all. Any archive that matched none of the installers above lands here and is copied across unchanged.

> **NOTE:** Landing in the fallback installer is a signal your archive layout needs fixing.

**Requirements:**

- Reaching this installer usually means the archive was not laid out in a way Vortex recognised.
- Vortex shows the user a notification when a mod installs through the fallback.

**Common mistakes:**

- If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report the mod as broken.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

