# Notes for Mod Authors - Marvel Rivals

Packaging rules for Marvel Rivals mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Root / Game Folder Mods | a top-level folder such as `Marvel` | the game folder itself (no subfolder) |
| Pak Mods | a `.pak` file | `MarvelGame\Marvel\Content\Paks\~mods` |
| Signature Bypass | `dsound.dll` and `marvelrivalsutocsignaturebypass.asi` | `MarvelGame\Marvel\Binaries\Win64` |
| Config File Mods | a config file such as `engine.ini` or `game.ini` | `LOCALAPPDATA\Marvel\Saved\Config\Windows` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Root / Game Folder Mods

For mods that replace or add files inside the game installation, laid out the same way they appear in the game folder.

```text
MyRootMod.zip
└── Marvel\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a top-level folder matching any of: `Marvel`.
- The matched folder and everything below it is copied into the game folder, preserving structure.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders instead of the game folders themselves adds an extra level and misplaces every file.

## Pak Mods

Standard content mods: one or more `.pak` files. Vortex installs the mod files themselves, so the folder structure around them in the archive does not matter.

```text
MyPakMod.zip
└── MyPakMod.pak
```

**Requirements:**

- Recognised by any file with the `.pak` extension.
- Surrounding folders are discarded - only the mod files are installed.
- If the archive holds several mod files, Vortex asks the user which to install, which is useful for shipping optional variants in one download.

Installs to: `MarvelGame\Marvel\Content\Paks\~mods`

**Common mistakes:**

- Shipping several unrelated paks in one archive when you meant them all to install - the user gets a choice dialog and may pick only one.

## Signature Bypass

This game ships signed pak files, so a signature bypass is required before most mods will load.

**Requirements:**

- Recognised only when BOTH `dsound.dll` and `marvelrivalsutocsignaturebypass.asi` are present in the archive.

Installs to: `MarvelGame\Marvel\Binaries\Win64`

**Common mistakes:**

- Shipping only one of the two files - the archive will fall through to another installer.

## Config File Mods

Config tweaks are deployed to the game's config folder in your user profile, not into the game installation.

**Requirements:**

- Recognised by any of these filenames in the archive: `engine.ini`, `game.ini`, `gameusersettings.ini`, `input.ini`, `scalability.ini`, `hardware.ini`, `deviceprofiles.ini`, `compat.ini`, `runtimeoptions.ini`, `gameplaytags.ini`, `enhancedinput.ini` or `consolevariables.ini`.
- Installed to `LOCALAPPDATA\Marvel\Saved\Config\Windows`.

Installs to: `LOCALAPPDATA\Marvel\Saved\Config\Windows`

**Common mistakes:**

- Shipping a config file with one of these names inside an unrelated mod - the whole archive is then treated as a config mod.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

