# Notes for Mod Authors - template-snowdropengine (template)

Packaging rules for template-snowdropengine (template) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| XXX Modloader | a file or folder named `version.dll` | - |
| XXX Data | a file or folder named `XXX` | - |
| XXX Datasub | a file or folder named one of: `baked`, `graph objects` or `game system data` | `XXX` |
| Config File Mods | a `graphic settings.cfg` file | `DOCUMENTS\My Games\XXX` |
| Fallback Installer | anything not matched above | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## XXX Modloader

Recognised when the archive contains a file or folder named `version.dll`.

## XXX Data

Recognised when the archive contains a file or folder named `XXX`.

## XXX Datasub

Recognised when the archive contains a file or folder named one of: `baked`, `graph objects` or `game system data`.

Installs to: `XXX`

## Config File Mods

Configuration tweaks, deployed to the game's config location.

**Requirements:**

- Recognised by any file named `graphic settings.cfg`.

Installs to: `DOCUMENTS\My Games\XXX`

**Common mistakes:**

- Shipping a config file with one of these names inside an unrelated mod makes the whole archive install as a config mod.

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

