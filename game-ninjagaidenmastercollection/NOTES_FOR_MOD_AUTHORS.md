# Notes for Mod Authors - NINJA GAIDEN: Master Collection

Packaging rules for NINJA GAIDEN: Master Collection mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Xboxmodloader | a file or folder named `tmx_ngloader.exe` | - |
| Ninjagaidensigma Steammodloader | a file or folder named `ninja gaiden sigma.exe` | - |
| Ninjagaidensigma2 Steammodloader | a file or folder named `ninja gaiden sigma2.exe` | - |
| Ninjagaiden3razorsedge Steammodloader | a file or folder named `ninja gaiden 3 razor's edge.exe` | - |
| Mlmod | a file with the `.dat` extension | `mods` |
| Databinfolder | a file or folder named `databin` | - |
| Databinsubfolder1 | a file or folder named one of: `bgm` or `movie` | `databin` |
| Databinsubfolder23 | a file or folder named one of: `sound` or `movie` | - |

Paths are relative to the game's install folder.

## Xboxmodloader

Recognised when the archive contains a file or folder named `tmx_ngloader.exe`.

## Ninjagaidensigma Steammodloader

Recognised when the archive contains a file or folder named `ninja gaiden sigma.exe`.

## Ninjagaidensigma2 Steammodloader

Recognised when the archive contains a file or folder named `ninja gaiden sigma2.exe`.

## Ninjagaiden3razorsedge Steammodloader

Recognised when the archive contains a file or folder named `ninja gaiden 3 razor's edge.exe`.

## Mlmod

Recognised when the archive contains a file with the `.dat` extension.

Installs to: `mods`

## Databinfolder

Recognised when the archive contains a file or folder named `databin`.

## Databinsubfolder1

Recognised when the archive contains a file or folder named one of: `bgm` or `movie`.

Installs to: `databin`

## Databinsubfolder23

Recognised when the archive contains a file or folder named one of: `sound` or `movie`.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

