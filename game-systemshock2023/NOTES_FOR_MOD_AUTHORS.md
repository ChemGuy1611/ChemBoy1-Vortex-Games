# Notes for Mod Authors - System Shock

Packaging rules for System Shock mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Config File Mods | a config file such as `engine.ini` or `game.ini` | `SystemShock\Saved\Config\WindowsNoEditor` |
| Save Game Files | a `.sav` file | `{localAppData}\SystemShock\Saved\SaveGames` |
| Root / Game Folder Mods | a top-level folder such as `SystemShock` | the game folder itself (no subfolder) |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Config File Mods

Config tweaks are deployed to the game's config folder in your user profile, not into the game installation.

**Requirements:**

- Recognised by any of these filenames in the archive: `engine.ini`, `game.ini`, `gameusersettings.ini`, `input.ini`, `scalability.ini`, `hardware.ini`, `deviceprofiles.ini`, `compat.ini`, `runtimeoptions.ini`, `gameplaytags.ini`, `enhancedinput.ini` or `consolevariables.ini`.
- Installed to `SystemShock\Saved\Config\WindowsNoEditor`.

Installs to: `SystemShock\Saved\Config\WindowsNoEditor`

**Common mistakes:**

- Shipping a config file with one of these names inside an unrelated mod - the whole archive is then treated as a config mod.

## Save Game Files

Save files are deployed to the game's save folder in your user profile.

**Requirements:**

- Recognised by any file with extension `.sav`.

Installs to: `{localAppData}\SystemShock\Saved\SaveGames`

**Common mistakes:**

- Including an example save alongside a normal mod - the archive is then treated as a save, not a mod.

## Root / Game Folder Mods

For mods that replace or add files inside the game installation, laid out the same way they appear in the game folder.

```text
MyRootMod.zip
└── SystemShock\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a top-level folder matching any of: `SystemShock`.
- The matched folder and everything below it is copied into the game folder, preserving structure.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders instead of the game folders themselves adds an extra level and misplaces every file.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

