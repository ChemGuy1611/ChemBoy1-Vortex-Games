# Notes for Mod Authors - NINJA GAIDEN: Master Collection

Packaging rules for NINJA GAIDEN: Master Collection mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Tmx_NgLoader (Mods Loader) | a `tmx_ngloader.exe` file | the game folder |
| Essential Files for NGS1 | a `ninja gaiden sigma.exe` file | the game folder |
| Ninjagaidensigma2 Steam Mod Loader | a `ninja gaiden sigma2.exe` file | - |
| Ninjagaiden3razorsedge Steam Mod Loader | a `ninja gaiden 3 razor's edge.exe` file | - |
| Mod Loader Mod | a `.dat` file | `mods` |
| Databin Folder | a `databin` folder | the game folder |
| Databin Subfolder | a `bgm` or `movie` folder | `databin` |
| Data Bin Subfolder 23 | a `sound` or `movie` folder | - |

Paths are relative to the game's install folder.

## Tmx_NgLoader (Mods Loader)

Recognised when the archive contains a `tmx_ngloader.exe` file.

Installs to: the game folder

## Essential Files for NGS1

Recognised when the archive contains a `ninja gaiden sigma.exe` file.

Installs to: the game folder

## Ninjagaidensigma2 Steam Mod Loader

Recognised when the archive contains a `ninja gaiden sigma2.exe` file.

## Ninjagaiden3razorsedge Steam Mod Loader

Recognised when the archive contains a `ninja gaiden 3 razor's edge.exe` file.

## Mod Loader Mod

Recognised when the archive contains a `.dat` file.

Installs to: `mods`

## Databin Folder

Recognised when the archive contains a `databin` folder.

Installs to: the game folder

## Databin Subfolder

Recognised when the archive contains a `bgm` or `movie` folder.

Installs to: `databin`

## Data Bin Subfolder 23

Recognised when the archive contains a `sound` or `movie` folder.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
