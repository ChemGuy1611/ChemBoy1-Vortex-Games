# Notes for Mod Authors - Need for Speed Heat

Packaging rules for Need for Speed Heat mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Frosty Mod Manager (tool) | a `frostymodmanager.exe` file | - |
| Frosty Mods | a `.fbmod` file | `FrostyModManager\Mods\NeedForSpeedHeat` |
| Plugin | a file with the `.exe` extension and a file with one of these extensions: `.dll` | `FrostyModManager\Plugins` |
| Key | - | `FrostyModManager` |
| Fallback Installer | anything not matched above | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Frosty Mod Manager (tool)

This installer handles Frosty Mod Manager itself, not mods for it. It exists so users can install Frosty Mod Manager through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `frostymodmanager.exe` in the archive.

**Common mistakes:**

- If you bundle Frosty Mod Manager inside your mod archive, Vortex treats the whole download as Frosty Mod Manager rather than as your mod. Ship the mod alone and list Frosty Mod Manager as a requirement.

## Frosty Mods

Frostbite mods in Frosty Mod Manager format. Vortex stages them for Frosty rather than deploying them into the game directly.

**Requirements:**

- Recognised by any file with the `.fbmod` or `.fbpack` extensions.

Installs to: `FrostyModManager\Mods\NeedForSpeedHeat`

**Common mistakes:**

- These mods still have to be applied through Frosty Mod Manager - installing in Vortex alone does not patch the game.

## Plugin

Recognised when the archive contains a file with the `.exe` extension and a file with one of these extensions: `.dll`.

Installs to: `FrostyModManager\Plugins`

## Key

Handled by the `testKey` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: `FrostyModManager`

## Fallback Installer

The catch-all. Any archive that matched none of the installers above lands here and is copied across unchanged.

> **NOTE:** Landing in the fallback installer is a signal your archive layout needs fixing.

**Requirements:**

- Reaching this installer usually means the archive was not laid out in a way Vortex recognised.
- Vortex shows the user a notification when a mod installs through the fallback.

**Common mistakes:**

- If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report the mod as broken.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

