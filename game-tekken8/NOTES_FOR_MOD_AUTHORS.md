# Notes for Mod Authors - TEKKEN 8

Packaging rules for TEKKEN 8 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Combo Mods (pak + UE4SS script/DLL together) | both a `Content` and a `Binaries` folder | `Polaris` |
| Pak Mods | a `.pak` file | `Polaris\Content\Paks\~mods` |
| Root / Game Folder Mods | a top-level folder such as `Polaris`, `Engine` or `Content` | the game folder itself (no subfolder) |
| Config File Mods | a config file such as `engine.ini` or `game.ini` | - |
| Save Game Files | a `.sav` file | - |
| Fallback Installer | anything unrecognised with no pak file | `Polaris\Binaries\Win64` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Combo Mods (pak + UE4SS script/DLL together)

Use this layout when one download ships both game content and UE4SS mods. It is recognised by the presence of BOTH a `Content` folder and a `Binaries` folder, laid out exactly as they appear inside the game folder.

```text
MyComboMod.zip
├── Content\
│   └── Paks\
│       └── LogicMods\
│           └── MyBlueprintMod.pak
└── Binaries\
    └── Win64\
        └── ue4ss\
            └── Mods\
                └── MyScriptMod\
                    └── Scripts\
                        └── main.lua
```

**Requirements:**

- Both a `Content` folder and a `Binaries` folder must be present, or this installer is skipped.
- Mirror the real in-game folder structure below those two folders.
- This installer is tested before the individual pak/script/DLL installers, so a matching archive is always handled as a combo.

Installs to: `Polaris`

**Common mistakes:**

- Including only one of `Content` or `Binaries` - the archive then falls through to a different installer.
- Adding an extra wrapper folder between `Binaries` and `Win64`.

## Pak Mods

Standard content mods: one or more `.pak` files. Vortex copies just the pak files themselves, flattened, so the folder structure around them does not matter.

```text
MyPakMod.zip
└── MyPakMod.pak
```

**Requirements:**

- Any archive containing a `.pak` file reaches this installer (unless an earlier one claimed it).
- Only the pak files are installed - surrounding folders are discarded.
- If the archive holds more than one pak, Vortex asks the user which to install - useful for optional variants.

Installs to: `Polaris\Content\Paks\~mods`

**Common mistakes:**

- Shipping several unrelated paks in one archive when you meant them all to install - the user gets a choice dialog and may pick only one.
- Blueprint mods belong in a `LogicMods` folder instead - see above.

## Root / Game Folder Mods

For mods that replace or add files inside the game installation, laid out the same way they appear in the game folder.

```text
MyRootMod.zip
└── Polaris\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a top-level folder matching any of: `Polaris`, `Engine`, `Content`, `Binaries` or `Mods`.
- The matched folder and everything below it is copied into the game folder, preserving structure.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders instead of the game folders themselves adds an extra level and misplaces every file.

## Config File Mods

Config tweaks are deployed to the game's config folder in your user profile, not into the game installation.

**Requirements:**

- Recognised by any of these filenames in the archive: `engine.ini`, `game.ini`, `gameusersettings.ini`, `input.ini`, `scalability.ini`, `hardware.ini`, `deviceprofiles.ini`, `compat.ini`, `runtimeoptions.ini`, `gameplaytags.ini`, `enhancedinput.ini` or `consolevariables.ini`.

**Common mistakes:**

- Shipping a config file with one of these names inside an unrelated mod - the whole archive is then treated as a config mod.

## Save Game Files

Save files are deployed to the game's save folder in your user profile.

**Requirements:**

- Recognised by any file with extension `.sav`.

**Common mistakes:**

- Including an example save alongside a normal mod - the archive is then treated as a save, not a mod.

## Fallback Installer

This is the catch-all. Any archive with no `.pak` file that matched none of the installers above lands here and is copied, unchanged, into the game's binaries folder.

> **NOTE:** Landing in the fallback installer is a signal your archive layout needs fixing.

**Requirements:**

- Reaching this installer usually means the archive was not laid out in a way Vortex recognised.
- Vortex shows the user a notification when a mod installs through the fallback.

Installs to: `Polaris\Binaries\Win64`

**Common mistakes:**

- If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report it as broken.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

