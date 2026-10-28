# Notes for Mod Authors - Dark Messiah of Might & Magic

Packaging rules for Dark Messiah of Might & Magic mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| wiltOS Mod Launcher | a `mm.exe` file | the game folder |
| Unlimited | a `unlimited_edition` folder | `_mods` |
| Root / Game Folder Mods | a `_mods` folder | the game folder |
| Launcher Mod | a `info.json` file | `_mods` |
| Game Data Folder | a `mm` folder | the game folder |
| Data Subfolder | a `materials`, `maps`, `bin`, `cfg`, `media`, `resource`, `scripts` or `SAVE` folder | `mm` |
| VPK Files | a `.vpk` file | `vpks` |
| Materials Subfolder | a `models`, `fx`, `sprites`, `cloth`, `console`, `correction`, `decals`, `detail`, `effects`, `engine`, `envcubemaps`, `generic`, `hud`, `nature`, `overlays`, `sun`, `vgui` or `voice` folder | `mm\materials` |
| Maps (.bsp) | a `.bsp` file | `mm\maps` |
| Save Game Files | a `.sav` file | `mm\SAVE` |
| Config File Mods | a `config.cfg` file | `mm\cfg` |

Paths are relative to the game's install folder. Config and save folders are in your user profile, not the game's install folder.

## wiltOS Mod Launcher

Recognised when the archive contains a `mm.exe` file.

Installs to: the game folder

## Unlimited

Recognised when the archive contains a `unlimited_edition` folder.

Installs to: `_mods`

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── _mods\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `_mods` in the archive.

Installs to: the game folder

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Launcher Mod

Recognised when the archive contains a `info.json` file.

Installs to: `_mods`

## Game Data Folder

Recognised when the archive contains a `mm` folder.

Installs to: the game folder

## Data Subfolder

Recognised when the archive contains a `materials`, `maps`, `bin`, `cfg`, `media`, `resource`, `scripts` or `SAVE` folder.

Installs to: `mm`

## VPK Files

Recognised when the archive contains a `.vpk` file.

Installs to: `vpks`

## Materials Subfolder

Recognised when the archive contains a `models`, `fx`, `sprites`, `cloth`, `console`, `correction`, `decals`, `detail`, `effects`, `engine`, `envcubemaps`, `generic`, `hud`, `nature`, `overlays`, `sun`, `vgui` or `voice` folder.

Installs to: `mm\materials`

## Maps (.bsp)

Recognised when the archive contains a `.bsp` file.

Installs to: `mm\maps`

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file with the `.sav` extension.

Installs to: `mm\SAVE`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Config File Mods

Configuration tweaks, deployed to the game's config location.

**Requirements:**

- Recognised by any file named `config.cfg`.

Installs to: `mm\cfg`

**Common mistakes:**

- Shipping a config file with one of these names inside an unrelated mod makes the whole archive install as a config mod.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
