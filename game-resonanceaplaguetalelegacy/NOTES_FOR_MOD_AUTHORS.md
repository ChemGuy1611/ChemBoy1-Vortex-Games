# Notes for Mod Authors - Resonance: A Plague Tale Legacy

Packaging rules for Resonance: A Plague Tale Legacy mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Merger | a file or folder named `ResonanceModMerger.exe` | - |
| Root / Game Folder Mods | a `DATAS` folder | the game folder itself (no subfolder) |
| Mod | a file with one of these extensions: `.psc` | `Mods` |

Paths are relative to the game's install folder.

## Merger

Recognised when the archive contains a file or folder named `ResonanceModMerger.exe`.

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

## Mod

Recognised when the archive contains a file with one of these extensions: `.psc`.

Installs to: `Mods`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

