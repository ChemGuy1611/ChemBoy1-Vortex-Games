# Notes for Mod Authors - Trails in the Sky 1st Chapter

Packaging rules for Trails in the Sky 1st Chapter mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Pac | a file with one of these extensions: `.pac` | `pac\steam` |
| Root / Game Folder Mods | a `asset` folder | the game folder itself (no subfolder) |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Pac

Recognised when the archive contains a file with one of these extensions: `.pac`.

Installs to: `pac\steam`

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── asset\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `asset`, `pac`, `asset_de`, `asset_en`, `asset_es`, `asset_fr`, `bgm1`, `bgm2`, `bgm3`, `layout`, `movie`, `movie_en`, `scene`, `script`, `script_de`, `script_en`, `script_es`, `script_fr`, `se`, `ssytem`, `table`, `table_de`, `table_en`, `table_es`, `table_fr`, `vfx`, `voice` or `voice_en` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

