# Notes for Mod Authors - Deus Ex: Invisible War

Packaging rules for Deus Ex: Invisible War mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Root / Game Folder Mods | a `System` folder | the game folder itself (no subfolder) |
| Datamodfolder | a file or folder named one of: `AcquiredDataText`, `Bitmaps`, `Conversations`, `Flags`, `LipsincData`, `Maps`, `MatLib`, `SkeletalAnimations`, `SkeletalMeshes`, `Sounds`, `StaticMeshes`, `TagDatabase`, `Textures`, `UTX` or `VideoTextures` | `content\DX2` |
| Binaries | - | `System` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── System\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `System` or `content` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Datamodfolder

Recognised when the archive contains a file or folder named one of: `AcquiredDataText`, `Bitmaps`, `Conversations`, `Flags`, `LipsincData`, `Maps`, `MatLib`, `SkeletalAnimations`, `SkeletalMeshes`, `Sounds`, `StaticMeshes`, `TagDatabase`, `Textures`, `UTX` or `VideoTextures`.

Installs to: `content\DX2`

## Binaries

Handled by the `testBinaries` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: `System`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

