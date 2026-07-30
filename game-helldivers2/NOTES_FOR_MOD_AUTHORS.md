# Notes for Mod Authors - Helldivers 2

Packaging rules for Helldivers 2 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Data | a file with the `.dl_bin` extension | `data\game` |
| Patch MergedMods This Is Fine Ignore This SELECT APPLY CHANGES DO NOT ENABLE | a file or folder named `9ba626afa44a3aa3.patch_0.gpu_resources` and a file with the `.patch_0` extension | - |
| Soundpatch | a file with the `.patch_0` extension | - |
| Stream | a file with the `.stream` extension | `data` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Data

Recognised when the archive contains a file with the `.dl_bin` extension.

Installs to: `data\game`

## Patch MergedMods This Is Fine Ignore This SELECT APPLY CHANGES DO NOT ENABLE

Recognised when the archive contains a file or folder named `9ba626afa44a3aa3.patch_0.gpu_resources` and a file with the `.patch_0` extension.

## Soundpatch

Recognised when the archive contains a file with the `.patch_0` extension.

## Stream

Recognised when the archive contains a file with the `.stream` extension.

Installs to: `data`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

