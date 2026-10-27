# Notes for Mod Authors - Borderlands 3

Packaging rules for Borderlands 3 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Openhotfixloader | a `openhotfixloader.dll` file and a `b3hm.exe` file | `OakGame\Binaries\Win64\Plugins` |
| Sdk | a `unrealsdk.dll` file and a `sdk_mods` folder | the game folder |
| Sdkmod | a `.py` file and a `.sdkmod` file | `sdk_mods` |
| Pluginloader | a `d3d11.dll` file | `OakGame\Binaries\Win64` |
| Hotfix | a `.bl3hotfix` file | `OakGame\Binaries\Win64\Plugins\ohl-mods` |
| Root / Game Folder Mods | a `OakGame` folder | the game folder |
| Pak | a `.pak` file | `OakGame\Content\Paks` |
| Movies | a `.mp4` file | `OakGame\Content\Movies` |
| Binaries | - | `OakGame\Binaries\Win64` |

Paths are relative to the game's install folder.

## Openhotfixloader

Recognised when the archive contains a `openhotfixloader.dll` file and a `b3hm.exe` file.

Installs to: `OakGame\Binaries\Win64\Plugins`

## Sdk

Recognised when the archive contains a `unrealsdk.dll` file and a `sdk_mods` folder.

Installs to: the game folder

## Sdkmod

Recognised when the archive contains a `.py` file and a `.sdkmod` file.

Installs to: `sdk_mods`

## Pluginloader

Recognised when the archive contains a `d3d11.dll` file.

Installs to: `OakGame\Binaries\Win64`

## Hotfix

Recognised when the archive contains a `.bl3hotfix` file.

Installs to: `OakGame\Binaries\Win64\Plugins\ohl-mods`

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── OakGame\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `OakGame` or `Engine` in the archive.

Installs to: the game folder

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Pak

Recognised when the archive contains a `.pak` file.

Installs to: `OakGame\Content\Paks`

## Movies

Recognised when the archive contains a `.mp4` file.

Installs to: `OakGame\Content\Movies`

## Binaries

Handled by the `testBinaries` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: `OakGame\Binaries\Win64`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
