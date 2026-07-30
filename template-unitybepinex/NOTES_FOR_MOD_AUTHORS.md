# Notes for Mod Authors - template-unitybepinex (template)

Packaging rules for template-unitybepinex (template) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Root / Game Folder Mods | a `XXX_Data` folder | the game folder itself (no subfolder) |
| BepInEx Configuration Manager | a `configurationmanager.dll` file | `Bepinex` |
| Assembly Replacement Mods | a `Assembly-CSharp.dll` file | `XXX_Data\Managed` |
| Asset Replacement Mods | a `.assets` file | `XXX_Data` |
| Fallback Installer | anything not matched above | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── XXX_Data\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `XXX_Data` or `XXX_Data` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## BepInEx Configuration Manager

This installer handles the BepInEx Configuration Manager plugin itself, not mods for it. It exists so users can install the BepInEx Configuration Manager plugin through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `configurationmanager.dll` in the archive.
- Requires the file `configurationmanager.dll` together with a `plugins` folder.

Installs to: `Bepinex`

**Common mistakes:**

- If you bundle the BepInEx Configuration Manager plugin inside your mod archive, Vortex treats the whole download as the BepInEx Configuration Manager plugin rather than as your mod. Ship the mod alone and list the BepInEx Configuration Manager plugin as a requirement.

## Assembly Replacement Mods

Mods that replace a compiled game assembly outright. These overwrite core game files, so they conflict with any other mod touching the same assembly.

**Requirements:**

- Recognised by any file named `Assembly-CSharp.dll` or `Assembly-CSharp-firstpass.dll`.

Installs to: `XXX_Data\Managed`

**Common mistakes:**

- Assembly replacements cannot be combined with other assembly mods - state this clearly on the mod page.
- Shipping an assembly alongside a plugin makes the whole archive install as an assembly mod.

## Asset Replacement Mods

Mods that replace packed Unity asset files, deployed into the game's data folder.

**Requirements:**

- Recognised by any file with the `.assets`, `.resource` or `.ress` extensions.

Installs to: `XXX_Data`

**Common mistakes:**

- Asset files must keep their original names to replace the right bundle.

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

