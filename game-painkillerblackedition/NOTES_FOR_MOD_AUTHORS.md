# Notes for Mod Authors - Painkiller: Black Edition

Packaging rules for Painkiller: Black Edition mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Root / Game Folder Mods | a `Bin` folder | the game folder itself (no subfolder) |
| Mod | a file with one of these extensions: `.pak` or `.pkm` and a file or folder named one of: `models`, `movies` or `music` | `Data` |
| Config File Mods | a `config.ini` file | `Bin` |
| Save Game Files | a `.dat` file | `SaveGames` |
| Binaries | - | `Bin` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── Bin\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `Bin` or `Data` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Mod

Recognised when the archive contains a file with one of these extensions: `.pak` or `.pkm` and a file or folder named one of: `models`, `movies` or `music`.

Installs to: `Data`

## Config File Mods

Configuration tweaks, deployed to the game's config location.

**Requirements:**

- Recognised by any file named `config.ini`.

Installs to: `Bin`

**Common mistakes:**

- Shipping a config file with one of these names inside an unrelated mod makes the whole archive install as a config mod.

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file with the `.dat` extension.

Installs to: `SaveGames`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Binaries

Handled by the `testBinaries` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: `Bin`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

