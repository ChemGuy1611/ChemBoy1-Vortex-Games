# Notes for Mod Authors - XCOM: Enemy Unknown

Packaging rules for XCOM: Enemy Unknown mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| TFC Installer (tool) | a `tfcinstaller.exe` file | the game folder itself (no subfolder) |
| UPK Explorer (tool) | a `upk explorer.exe` file | the game folder itself (no subfolder) |
| TFC Mods | a `gameprofile.xml` file or a `.packagepatch` file | `TFCInstaller\Mods` |
| Root / Game Folder Mods | a `Engine` folder | the game folder itself (no subfolder) |
| Cooked Content Mods | a `Maps` folder or a `.upk` file | `XXX\CookedPC` |
| Movie / Cutscene Replacements | a `.bik` file | `XXX\Movies` |
| Binaries / Injector Mods | a `XXX.exe` file or a `.exe` file | `Binaries\Win32` |
| Fallback Installer | anything not matched above | - |

Paths are relative to the game's install folder.

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

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── Engine\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `Engine`, `Binaries`, `Config`, `CookedPC`, `DLC`, `Localization` or `Movies` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Cooked Content Mods

Packaged content deployed into the game's cooked content folder.

**Requirements:**

- Recognised by a folder named `Maps` or `Packages` in the archive.
- Recognised by any file with the `.upk` extension.

Installs to: `XXX\CookedPC`

## Movie / Cutscene Replacements

Replacement video files, deployed into the game's movies folder.

**Requirements:**

- Recognised by any file with the `.bik` extension.

Installs to: `XXX\Movies`

**Common mistakes:**

- The replacement must keep the original file name, or the game will not pick it up.

## Binaries / Injector Mods

DLL injectors and other files that belong next to the game executable.

**Requirements:**

- Recognised by any file named `XXX.exe`.
- Recognised by any file with the `.exe`, `.dll`, `.asi` or `.addon64` extensions.

Installs to: `Binaries\Win32`

## Fallback Installer

The catch-all. Any archive that matched none of the installers above lands here and is copied across unchanged.

> **NOTE:** Landing in the fallback installer is a signal your archive layout needs fixing.

**Requirements:**

- Reaching this installer usually means the archive was not laid out in a way Vortex recognised.
- Vortex shows the user a notification when a mod installs through the fallback.

**Common mistakes:**

- If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report the mod as broken.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

