# Notes for Mod Authors - The Last of Us Part II Remastered

Packaging rules for The Last of Us Part II Remastered mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Modloader | a `winmm.dll` file | the game folder |
| Psarc | a `.psarc` file | `mods` |
| Buildfolderpakbin | a `build` folder, a `.pak` file and a `.bin` file | the game folder |
| Binfolder | a `bin` folder, a `.pak` file and a `.bin` file | `build\pc\main` |
| Pak | a `.pak` file | `build\pc\main` |
| Buildfolder | a `build` folder | the game folder |
| Save Game Files | a `USR-DATA` file | `%USERPROFILE%\Documents\The Last of Us Part II\<User ID>\savedata` |
| Config File Mods | a `screeninfo.cfg` file | `%USERPROFILE%\SOFTWARE\Naughty Dog\The Last of Us Part II` |
| Psarctoolndarc | a `ndarc.exe` file | `build\pc\main` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Modloader

Recognised when the archive contains a `winmm.dll` file.

Installs to: the game folder

## Psarc

Recognised when the archive contains a `.psarc` file.

Installs to: `mods`

## Buildfolderpakbin

Recognised when the archive contains a `build` folder, a `.pak` file and a `.bin` file.

Installs to: the game folder

## Binfolder

Recognised when the archive contains a `bin` folder, a `.pak` file and a `.bin` file.

Installs to: `build\pc\main`

## Pak

Recognised when the archive contains a `.pak` file.

Installs to: `build\pc\main`

## Buildfolder

Recognised when the archive contains a `build` folder.

Installs to: the game folder

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file named `USR-DATA`.

Installs to: `%USERPROFILE%\Documents\The Last of Us Part II\<User ID>\savedata`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Config File Mods

Configuration tweaks, deployed to the game's config location.

**Requirements:**

- Recognised by any file named `screeninfo.cfg`.

Installs to: `%USERPROFILE%\SOFTWARE\Naughty Dog\The Last of Us Part II`

**Common mistakes:**

- Shipping a config file with one of these names inside an unrelated mod makes the whole archive install as a config mod.

## Psarctoolndarc

Recognised when the archive contains a `ndarc.exe` file.

Installs to: `build\pc\main`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
