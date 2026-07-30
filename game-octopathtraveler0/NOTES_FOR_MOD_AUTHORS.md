# Notes for Mod Authors - OCTOPATH TRAVELER 0

Packaging rules for OCTOPATH TRAVELER 0 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Combo Mods (pak + UE4SS script/DLL together) | both a `Content` and a `Binaries` folder | `Octopath_Traveler0` |
| Blueprint Mods (LogicMods) | a `LogicMods` folder | `Octopath_Traveler0\Content\Paks\LogicMods` |
| Pak Mods | a `.pak` file | `Octopath_Traveler0\Content\Paks\~mods` |
| UE4SS Itself | a `dwmapi.dll` file | `Octopath_Traveler0\Binaries\Win64` |
| UE4SS Script Mods (Lua) | a `.lua` file and a `Scripts` folder | `Octopath_Traveler0\Binaries\Win64\ue4ss\Mods` |
| UE4SS DLL Mods (C++) | a `.dll` file and a `dlls` folder | `Octopath_Traveler0\Binaries\Win64\ue4ss\Mods` |
| Root / Game Folder Mods | a top-level folder such as `Octopath_Traveler0`, `Engine` or `Content` | the game folder itself (no subfolder) |
| Config File Mods | a config file such as `engine.ini` or `game.ini` | - |
| Save Game Files | a `.sav` file | - |
| Fallback Installer | anything unrecognised with no pak file | `Octopath_Traveler0\Binaries\Win64` |

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

Installs to: `Octopath_Traveler0`

**Common mistakes:**

- Including only one of `Content` or `Binaries` - the archive then falls through to a different installer.
- Adding an extra wrapper folder between `Binaries` and `Win64`.

## Blueprint Mods (LogicMods)

Blueprint mods built against UE4SS must sit inside a folder named `LogicMods`. This is the single most common packaging mistake for Unreal games.

> **NOTE:** A blueprint `.pak` outside a `LogicMods` folder will install, but it will not work in game.

```text
MyBlueprintMod.zip
└── LogicMods\
    └── MyBlueprintMod.pak
```

**Requirements:**

- The archive must contain a folder named `LogicMods` (case does not matter).
- Everything from the `LogicMods` folder down is copied to the game, keeping its structure.
- Extra folders above `LogicMods` are fine - the installer finds it at any depth.

Installs to: `Octopath_Traveler0\Content\Paks\LogicMods`

**Common mistakes:**

- Putting the `.pak` at the top level of the archive with no `LogicMods` folder. Vortex then treats it as an ordinary pak mod, installs it to the wrong place, and the blueprint mod never loads.
- Renaming the folder (`Logic_Mods`, `logicmod`, `BPMods`) - the name must be exactly `LogicMods`.

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

Installs to: `Octopath_Traveler0\Content\Paks\~mods`

**Common mistakes:**

- Shipping several unrelated paks in one archive when you meant them all to install - the user gets a choice dialog and may pick only one.

## UE4SS Itself

This installer handles the UE4SS runtime package, not individual mods. Most authors never need it - it exists so users can install UE4SS through Vortex.

**Requirements:**

- Recognised by a file named `dwmapi.dll` at any level of the archive.

Installs to: `Octopath_Traveler0\Binaries\Win64`

**Common mistakes:**

- If your script mod archive happens to contain a file named `dwmapi.dll`, it will be treated as a UE4SS install rather than as your mod.

## UE4SS Script Mods (Lua)

Lua mods for UE4SS. Recognised when the archive holds both a `.lua` file and a folder named `Scripts`.

```text
MyScriptMod.zip
└── MyScriptMod\
    └── Scripts\
        └── main.lua
```

**Requirements:**

- The archive must contain a `.lua` file AND a folder named `Scripts`.
- Wrap the `Scripts` folder in a folder named after your mod. That folder name becomes the mod's UE4SS name and is what gets written to the load order.
- If you omit the wrapper folder, Vortex falls back to naming the mod after the archive file.

Installs to: `Octopath_Traveler0\Binaries\Win64\ue4ss\Mods`

**Common mistakes:**

- Putting `main.lua` directly in the archive root with no `Scripts` folder - the mod is not recognised as a script mod.
- Naming the wrapper folder something generic like `Mods` - that name is what appears in the load order.

## UE4SS DLL Mods (C++)

Compiled UE4SS mods. Recognised when the archive holds both a `.dll` file and a folder named `dlls`.

```text
MyDllMod.zip
└── MyDllMod\
    └── dlls\
        └── main.dll
```

**Requirements:**

- The archive must contain a `.dll` file AND a folder named `dlls`.
- Wrap the `dlls` folder in a folder named after your mod - that name is used in the load order.

Installs to: `Octopath_Traveler0\Binaries\Win64\ue4ss\Mods`

**Common mistakes:**

- A bare `.dll` with no `dlls` folder is not recognised as a UE4SS DLL mod and will reach the fallback installer.

## Root / Game Folder Mods

For mods that replace or add files inside the game installation, laid out the same way they appear in the game folder.

```text
MyRootMod.zip
└── Octopath_Traveler0\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a top-level folder matching any of: `Octopath_Traveler0`, `Engine`, `Content`, `Binaries` or `Mods`.
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

Installs to: `Octopath_Traveler0\Binaries\Win64`

**Common mistakes:**

- If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report it as broken.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

