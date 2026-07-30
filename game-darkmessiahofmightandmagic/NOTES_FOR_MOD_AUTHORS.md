# Notes for Mod Authors - Dark Messiah of Might & Magic

Packaging rules for Dark Messiah of Might & Magic mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Launcher | a file or folder named `mm.exe` | - |
| Unlimited | a file or folder named `unlimited_edition` | - |
| Root / Game Folder Mods | a `_mods` folder | the game folder itself (no subfolder) |
| Launchermod | a file or folder named `info.json` | `_mods` |
| Data | a file or folder named `mm` | - |
| Datasub | a file or folder named one of: `materials`, `maps`, `bin`, `cfg`, `media`, `resource`, `scripts` or `SAVE` | `mm` |
| Vpk | a file with the `.vpk` extension | `vpks` |
| Materialssub | a file or folder named one of: `models`, `fx`, `sprites`, `cloth`, `console`, `correction`, `decals`, `detail`, `effects`, `engine`, `envcubemaps`, `generic`, `hud`, `nature`, `overlays`, `sun`, `vgui` or `voice` | `mm\materials` |
| Maps | a file with the `.bsp` extension | `mm\maps` |
| Save Game Files | a `.sav` file | `mm\SAVE` |
| Config File Mods | a `config.cfg` file | `mm\cfg` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Launcher

Recognised when the archive contains a file or folder named `mm.exe`.

## Unlimited

Recognised when the archive contains a file or folder named `unlimited_edition`.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── _mods\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `_mods` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Launchermod

Recognised when the archive contains a file or folder named `info.json`.

Installs to: `_mods`

## Data

Recognised when the archive contains a file or folder named `mm`.

## Datasub

Recognised when the archive contains a file or folder named one of: `materials`, `maps`, `bin`, `cfg`, `media`, `resource`, `scripts` or `SAVE`.

Installs to: `mm`

## Vpk

Recognised when the archive contains a file with the `.vpk` extension.

Installs to: `vpks`

## Materialssub

Recognised when the archive contains a file or folder named one of: `models`, `fx`, `sprites`, `cloth`, `console`, `correction`, `decals`, `detail`, `effects`, `engine`, `envcubemaps`, `generic`, `hud`, `nature`, `overlays`, `sun`, `vgui` or `voice`.

Installs to: `mm\materials`

## Maps

Recognised when the archive contains a file with the `.bsp` extension.

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

