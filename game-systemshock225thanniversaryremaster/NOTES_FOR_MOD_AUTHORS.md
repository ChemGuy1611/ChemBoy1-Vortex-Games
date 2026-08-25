# Notes for Mod Authors - System Shock 2 (Classic AND 25th Anniversary Remaster)

Packaging rules for System Shock 2 (Classic AND 25th Anniversary Remaster) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Kpfmod | a file with one of these extensions: `.kpf` | `mods` |
| Convertedlegacy | a file or folder named one of: `obj`, `mesh`, `bitmap`, `motions`, `sq_scripts`, `sdn2`, `strings`, `iface`, `intrface`, `misdml` or `snd` and a file with one of these extensions: `.dml`, `.gam` or `.mis` | `mods` |
| Rootfolder | a file or folder named one of: `mods` or `cutscenes` | - |
| Root / Game Folder Mods | a `mods` folder | the game folder itself (no subfolder) |
| Systemshock2 Classicmod | - | - |

Paths are relative to the game's install folder.

## Kpfmod

Recognised when the archive contains a file with one of these extensions: `.kpf`.

Installs to: `mods`

## Convertedlegacy

Recognised when the archive contains a file or folder named one of: `obj`, `mesh`, `bitmap`, `motions`, `sq_scripts`, `sdn2`, `strings`, `iface`, `intrface`, `misdml` or `snd` and a file with one of these extensions: `.dml`, `.gam` or `.mis`.

Installs to: `mods`

## Rootfolder

Recognised when the archive contains a file or folder named one of: `mods` or `cutscenes`.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── mods\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `mods` or `cutscenes` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Systemshock2 Classicmod

Handled by the `testClassic` installer. Inspect the extension source for the exact archive layout it expects.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

