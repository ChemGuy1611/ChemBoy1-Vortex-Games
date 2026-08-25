# Notes for Mod Authors - Selaco

Packaging rules for Selaco mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Mod | a file with one of these extensions: `.pk3` | `Mods` |
| Root / Game Folder Mods | a `fm_banks` folder | the game folder itself (no subfolder) |
| Binaries | - | - |

Paths are relative to the game's install folder.

## Mod

Recognised when the archive contains a file with one of these extensions: `.pk3`.

Installs to: `Mods`

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── fm_banks\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `fm_banks`, `Save`, `soundfonts` or `UltimateSelacoBuilder` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Binaries

Handled by the `testBinaries` installer. Inspect the extension source for the exact archive layout it expects.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

