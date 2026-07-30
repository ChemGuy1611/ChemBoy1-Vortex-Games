# Notes for Mod Authors - The Last of Us Part II Remastered

Packaging rules for The Last of Us Part II Remastered mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Modloader | a file or folder named `winmm.dll` | the game folder itself (no subfolder) |
| Psarc | a file with the `.psarc` extension, a file with the `.pak` extension and a file with the `.bin` extension | `mods` |
| Buildfolderpakbin | a file or folder named `build`, a file with the `.pak` extension and a file with the `.bin` extension | - |
| Binfolder | a file or folder named `bin`, a file with the `.pak` extension and a file with the `.bin` extension | `build\pc\main` |
| Pak | a file with the `.pak` extension | `build\pc\main` |
| Buildfolder | a file or folder named `build` | the game folder itself (no subfolder) |
| Save | a file or folder named `USR-DATA` | `DOCUMENTS\The Last of Us Part II\USERID_FOLDER\savedata` |
| Config File Mods | a `screeninfo.cfg` file | `USER_HOME\SOFTWARE\Naughty Dog\The Last of Us Part II` |
| Psarctoolndarc | a file or folder named `ndarc.exe` | `build\pc\main` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Modloader

Recognised when the archive contains a file or folder named `winmm.dll`.

Installs to: the game folder itself (no subfolder)

## Psarc

Recognised when the archive contains a file with the `.psarc` extension, a file with the `.pak` extension and a file with the `.bin` extension.

Installs to: `mods`

## Buildfolderpakbin

Recognised when the archive contains a file or folder named `build`, a file with the `.pak` extension and a file with the `.bin` extension.

## Binfolder

Recognised when the archive contains a file or folder named `bin`, a file with the `.pak` extension and a file with the `.bin` extension.

Installs to: `build\pc\main`

## Pak

Recognised when the archive contains a file with the `.pak` extension.

Installs to: `build\pc\main`

## Buildfolder

Recognised when the archive contains a file or folder named `build`.

Installs to: the game folder itself (no subfolder)

## Save

Recognised when the archive contains a file or folder named `USR-DATA`.

Installs to: `DOCUMENTS\The Last of Us Part II\USERID_FOLDER\savedata`

## Config File Mods

Configuration tweaks, deployed to the game's config location.

**Requirements:**

- Recognised by any file named `screeninfo.cfg`.

Installs to: `USER_HOME\SOFTWARE\Naughty Dog\The Last of Us Part II`

**Common mistakes:**

- Shipping a config file with one of these names inside an unrelated mod makes the whole archive install as a config mod.

## Psarctoolndarc

Recognised when the archive contains a file or folder named `ndarc.exe`.

Installs to: `build\pc\main`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

