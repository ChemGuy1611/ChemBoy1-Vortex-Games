# Notes for Mod Authors - Borderlands

Packaging rules for Borderlands mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| TFC Installer (tool) | a `tfcinstaller.exe` file | the game folder itself (no subfolder) |
| UPK Explorer (tool) | a `upk explorer.exe` file | the game folder itself (no subfolder) |
| TFC Mods | a `gameprofile.xml` file or a `.packagepatch` file | `TFCInstaller\Mods` |
| Sdk | a file or folder named `unrealsdk.dll` and a file or folder named `sdk_mods` | the game folder itself (no subfolder) |
| Sdkmod | a file with the `.py` extension and a file with the `.sdkmod` extension | `sdk_mods` |
| Root / Game Folder Mods | a `WillowGame` folder | the game folder itself (no subfolder) |
| Cooked Content Mods | a `DLC` folder or a `.upk` file | `WillowGame\CookedPC` |
| Movie / Cutscene Replacements | a `.bik` file | `WillowGame\Movies` |
| Binaries / Injector Mods | a `Borderlands.exe` file or a `.dll` file | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## TFC Installer (tool)

This installer handles the TFC Installer itself, not mods for it. It exists so users can install the TFC Installer through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `tfcinstaller.exe` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- If you bundle the TFC Installer inside your mod archive, Vortex treats the whole download as the TFC Installer rather than as your mod. Ship the mod alone and list the TFC Installer as a requirement.

## UPK Explorer (tool)

This installer handles UPK Explorer itself, not mods for it. It exists so users can install UPK Explorer through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `upk explorer.exe` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- If you bundle UPK Explorer inside your mod archive, Vortex treats the whole download as UPK Explorer rather than as your mod. Ship the mod alone and list UPK Explorer as a requirement.

## TFC Mods

Texture/content mods handled through the TFC system.

**Requirements:**

- Recognised by any file named `gameprofile.xml`, `gameprofile.idremappings.xml`, `objectdescriptors.xml`, `packageextensions.xml`, `texturepack` or `game`.
- Recognised by any file with the `.packagepatch`, `.descriptor`, `.tfcmapping` or `.inipatch` extensions.

Installs to: `TFCInstaller\Mods`

**Common mistakes:**

- Keep the original file names - the TFC system matches them by name.

## Sdk

Recognised when the archive contains a file or folder named `unrealsdk.dll` and a file or folder named `sdk_mods`.

Installs to: the game folder itself (no subfolder)

## Sdkmod

Recognised when the archive contains a file with the `.py` extension and a file with the `.sdkmod` extension.

Installs to: `sdk_mods`

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── WillowGame\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `WillowGame`, `Engine`, `Binaries`, `Config`, `CookedPC`, `Localization`, `Movies` or `Splash` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Cooked Content Mods

Packaged content deployed into the game's cooked content folder.

**Requirements:**

- Recognised by a folder named `DLC`, `Maps`, `Mods`, `Packages`, `Patch`, `Test` or `UI` in the archive.
- Recognised by any file with the `.upk` or `.u` extensions.

Installs to: `WillowGame\CookedPC`

## Movie / Cutscene Replacements

Replacement video files, deployed into the game's movies folder.

**Requirements:**

- Recognised by any file with the `.bik` extension.

Installs to: `WillowGame\Movies`

**Common mistakes:**

- The replacement must keep the original file name, or the game will not pick it up.

## Binaries / Injector Mods

DLL injectors and other files that belong next to the game executable.

**Requirements:**

- Recognised by any file named `Borderlands.exe` or `BorderlandsGOTY.exe`.
- Recognised by any file with the `.dll`, `.asi` or `.addon64` extensions.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

