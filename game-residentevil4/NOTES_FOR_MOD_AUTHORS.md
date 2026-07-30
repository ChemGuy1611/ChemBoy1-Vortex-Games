# Notes for Mod Authors - Resident Evil 4 (2005)

Packaging rules for Resident Evil 4 (2005) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Binaries | a file with one of these extensions: `.exe`, `.dll`, `.asi` or `.addon64` | - |
| Root / Game Folder Mods | a `BIO4` folder | the game folder itself (no subfolder) |
| Save Game Files | a `.sav` file | `Bin32\profile\player\saves` |
| Fallback Installer | anything not matched above | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Binaries

Recognised when the archive contains a file with one of these extensions: `.exe`, `.dll`, `.asi` or `.addon64`.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── BIO4\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `BIO4`, `Bin32`, `Bgm`, `Em`, `Etc`, `Evd`, `Font`, `gradients`, `ImagePack`, `ImagePackHD`, `iww`, `Key`, `movie`, `op`, `option`, `Ranking`, `rel`, `snd`, `SS`, `St0`, `St1`, `St2`, `St3`, `St4`, `St5`, `St6`, `St7`, `sv`, `text`, `Title` or `uvdata` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file with the `.sav` extension.

Installs to: `Bin32\profile\player\saves`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

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

