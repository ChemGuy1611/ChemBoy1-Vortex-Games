# Notes for Mod Authors - Rocksmith 2014 Edition REMASTERED

Packaging rules for Rocksmith 2014 Edition REMASTERED mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Root / Game Folder Mods | a `base` folder or a `cache.psarc` file | the game folder itself (no subfolder) |
| Cdlcmod | a file with the `.psarc` extension | `dlc` |
| Eof | a file or folder named `eof.exe` | `EditorOnFire` |

Paths are relative to the game's install folder.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── base\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `base`, `dlc`, `guitarcade` or `venues` in the archive.
- Recognised by a file named `cache.psarc`, `audio.psarc`, `crowd.psarc`, `etudes.psarc`, `gears.psarc`, `guitars.psarc`, `session.psarc`, `songs.psarc`, `static.psarc` or `video.psarc`.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Cdlcmod

Recognised when the archive contains a file with the `.psarc` extension.

Installs to: `dlc`

## Eof

Recognised when the archive contains a file or folder named `eof.exe`.

Installs to: `EditorOnFire`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

