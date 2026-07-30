# Notes for Mod Authors - Star Wars Outlaws

Packaging rules for Star Wars Outlaws mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Modloader | a file or folder named `version.dll` | - |
| Data | a file or folder named `helix` | - |
| Datasub | a file or folder named one of: `baked`, `graph objects` or `game system data` | `helix` |
| Config File Mods | a `graphic settings.cfg` file | `DOCUMENTS\My Games\Outlaws` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Modloader

Recognised when the archive contains a file or folder named `version.dll`.

## Data

Recognised when the archive contains a file or folder named `helix`.

## Datasub

Recognised when the archive contains a file or folder named one of: `baked`, `graph objects` or `game system data`.

Installs to: `helix`

## Config File Mods

Configuration tweaks, deployed to the game's config location.

**Requirements:**

- Recognised by any file named `graphic settings.cfg`.

Installs to: `DOCUMENTS\My Games\Outlaws`

**Common mistakes:**

- Shipping a config file with one of these names inside an unrelated mod makes the whole archive install as a config mod.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

