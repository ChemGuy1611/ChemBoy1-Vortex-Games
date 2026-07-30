# Notes for Mod Authors - PC Building Simulator 2

Packaging rules for PC Building Simulator 2 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Root | a file or folder named `PCBS2_Data` | - |
| BepInEx Configuration Manager | a `configurationmanager.dll` file | `Bepinex` |
| Pcbuild | a file with one of these extensions: `.pcbs` | `PCs` |
| Assembly Replacement Mods | a `GameAssembly.dll` file | the game folder itself (no subfolder) |
| Asset Replacement Mods | a `.assets` file | `PCBS2_Data` |
| Save Game Files | a `.binary` file | `Saves` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Root

Recognised when the archive contains a file or folder named `PCBS2_Data`.

## BepInEx Configuration Manager

This installer handles the BepInEx Configuration Manager plugin itself, not mods for it. It exists so users can install the BepInEx Configuration Manager plugin through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `configurationmanager.dll` in the archive.
- Requires the file `configurationmanager.dll` together with a `plugins` folder.

Installs to: `Bepinex`

**Common mistakes:**

- If you bundle the BepInEx Configuration Manager plugin inside your mod archive, Vortex treats the whole download as the BepInEx Configuration Manager plugin rather than as your mod. Ship the mod alone and list the BepInEx Configuration Manager plugin as a requirement.

## Pcbuild

Recognised when the archive contains a file with one of these extensions: `.pcbs`.

Installs to: `PCs`

## Assembly Replacement Mods

Mods that replace a compiled game assembly outright. These overwrite core game files, so they conflict with any other mod touching the same assembly.

**Requirements:**

- Recognised by any file named `GameAssembly.dll`.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Assembly replacements cannot be combined with other assembly mods - state this clearly on the mod page.
- Shipping an assembly alongside a plugin makes the whole archive install as an assembly mod.

## Asset Replacement Mods

Mods that replace packed Unity asset files, deployed into the game's data folder.

**Requirements:**

- Recognised by any file with the `.assets`, `.resource` or `.ress` extensions.

Installs to: `PCBS2_Data`

**Common mistakes:**

- Asset files must keep their original names to replace the right bundle.

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file with the `.binary` extension.

Installs to: `Saves`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

