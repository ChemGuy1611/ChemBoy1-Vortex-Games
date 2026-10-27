# Notes for Mod Authors - NINJA GAIDEN: Master Collection

Packaging rules for NINJA GAIDEN: Master Collection mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Xboxmodloader | a `tmx_ngloader.exe` file | the game folder |
| Ninjagaidensigma Steammodloader | a `ninja gaiden sigma.exe` file | the game folder |
| Ninjagaidensigma2 Steammodloader | a `ninja gaiden sigma2.exe` file | - |
| Ninjagaiden3razorsedge Steammodloader | a `ninja gaiden 3 razor's edge.exe` file | - |
| Mlmod | a `.dat` file | `mods` |
| Databinfolder | a `databin` folder | the game folder |
| Databinsubfolder1 | a `bgm` or `movie` folder | `databin` |
| Databinsubfolder23 | a `sound` or `movie` folder | - |

Paths are relative to the game's install folder.

## Xboxmodloader

Recognised when the archive contains a `tmx_ngloader.exe` file.

Installs to: the game folder

## Ninjagaidensigma Steammodloader

Recognised when the archive contains a `ninja gaiden sigma.exe` file.

Installs to: the game folder

## Ninjagaidensigma2 Steammodloader

Recognised when the archive contains a `ninja gaiden sigma2.exe` file.

## Ninjagaiden3razorsedge Steammodloader

Recognised when the archive contains a `ninja gaiden 3 razor's edge.exe` file.

## Mlmod

Recognised when the archive contains a `.dat` file.

Installs to: `mods`

## Databinfolder

Recognised when the archive contains a `databin` folder.

Installs to: the game folder

## Databinsubfolder1

Recognised when the archive contains a `bgm` or `movie` folder.

Installs to: `databin`

## Databinsubfolder23

Recognised when the archive contains a `sound` or `movie` folder.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
