# Notes for Mod Authors - Prey Vortex Extension (Alt version)

Packaging rules for Prey Vortex Extension (Alt version) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Pric | a file or folder named `preyinterfacecustomizergui.exe` | - |
| Chairloader | a file or folder named `chairmanager.exe` | - |
| Chairmodzip | a file or folder named `modinfo.xml` | - |
| Root / Game Folder Mods | a `GameSDK` folder | the game folder itself (no subfolder) |
| Binaries | a file with one of these extensions: `.exe`, `.dll`, `.asi` or `.addon64` | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Pric

Recognised when the archive contains a file or folder named `preyinterfacecustomizergui.exe`.

## Chairloader

Recognised when the archive contains a file or folder named `chairmanager.exe`.

## Chairmodzip

Recognised when the archive contains a file or folder named `modinfo.xml`.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── GameSDK\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `GameSDK`, `Whiplash`, `Binaries`, `Engine` or `Localization` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Binaries

Recognised when the archive contains a file with one of these extensions: `.exe`, `.dll`, `.asi` or `.addon64`.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

