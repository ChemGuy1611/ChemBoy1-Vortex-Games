# Notes for Mod Authors - game-warhammer40kdarktide

Packaging rules for game-warhammer40kdarktide mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| //Covers DML And LOFM
    "Warhammer40kdarktide Dmfdml" | a file with the `.bat` extension | - |
| //Regular Mods & DMF
    "Warhammer40kdarktide Mod" | a file with the `.mod` extension | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## //Covers DML And LOFM
    "Warhammer40kdarktide Dmfdml"

Recognised when the archive contains a file with the `.bat` extension.

## //Regular Mods & DMF
    "Warhammer40kdarktide Mod"

Recognised when the archive contains a file with the `.mod` extension.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

