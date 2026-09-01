# Notes for Mod Authors - Resonance: A Plague Tale Legacy

Packaging rules for Resonance: A Plague Tale Legacy mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Merger | - | - |
| Framework | - | - |
| Asiloader | a file or folder named `RAPTL_Framework.asi` | - |
| Mod | a file with one of these extensions: `.psc` | `Mods` |
| Frameworkmod | a file or folder named one of: `textures` | `Mods` |
| Root / Game Folder Mods | a `DATAS` folder | the game folder itself (no subfolder) |
| Texturestudio | a file with the `.exe` extension | `TextureStudio` |

Paths are relative to the game's install folder.

## Merger

Handled by the `testLoader` installer. Inspect the extension source for the exact archive layout it expects.

## Framework

Handled by the `testFramework` installer. Inspect the extension source for the exact archive layout it expects.

## Asiloader

Recognised when the archive contains a file or folder named `RAPTL_Framework.asi`.

## Mod

Recognised when the archive contains a file with one of these extensions: `.psc`.

Installs to: `Mods`

## Frameworkmod

Recognised when the archive contains a file or folder named one of: `textures`.

Installs to: `Mods`

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── DATAS\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `DATAS`, `FONT`, `INPUT`, `LEVELS`, `Resources`, `RTC`, `RTE`, `Shaders`, `SOUNDBANKS` or `VIDEOS` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Texturestudio

Recognised when the archive contains a file with the `.exe` extension.

Installs to: `TextureStudio`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

