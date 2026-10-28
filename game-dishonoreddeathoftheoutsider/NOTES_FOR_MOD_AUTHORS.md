# Notes for Mod Authors - Dishonored: Death of the Outsider

Packaging rules for Dishonored: Death of the Outsider mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Void Installer | a `voidinstaller.exe` file | the game folder |
| Void Explorer | a `voidexplorer.exe` file | the game folder |
| Void Mod | a `modinfo.xml` file and a `.voidindex` or `.voidresources` file | `Void Installer\Mods` |
| Root / Game Folder Mods | a `base` folder | the game folder |
| Video Mod | a `.bk2` file | `base\video` |
| Save Game Files | a `profile.bin` file or a `.sav` file | the game's save folder |
| Config File Mods | a `dishonored_doconfig.cfg` file | `%USERPROFILE%\Saved Games\Arkane Studios\Dishonored_DO\base` |

Paths are relative to the game's install folder. Config and save folders are in your user profile, not the game's install folder.

## Void Installer

Recognised when the archive contains a `voidinstaller.exe` file.

Installs to: the game folder

## Void Explorer

Recognised when the archive contains a `voidexplorer.exe` file.

Installs to: the game folder

## Void Mod

Recognised when the archive contains a `modinfo.xml` file and a `.voidindex` or `.voidresources` file.

Installs to: `Void Installer\Mods`

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── base\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `base` in the archive.

Installs to: the game folder

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Video Mod

Recognised when the archive contains a `.bk2` file.

Installs to: `base\video`

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file named `profile.bin`.
- Recognised by any file with the `.sav` extension.

Installs to: the game's save folder

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Config File Mods

Configuration tweaks, deployed to the game's config location.

**Requirements:**

- Recognised by any file named `dishonored_doconfig.cfg`.

Installs to: `%USERPROFILE%\Saved Games\Arkane Studios\Dishonored_DO\base`

**Common mistakes:**

- Shipping a config file with one of these names inside an unrelated mod makes the whole archive install as a config mod.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
