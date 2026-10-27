# Notes for Mod Authors - Prodeus

Packaging rules for Prodeus mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| MelonLoader (mod loader) | a `version.dll` file | the game folder |
| Root / Game Folder Mods | a `Prodeus_Data` folder | the game folder |
| MelonLoader Preferences Manager | a `melonprefmanager.il2cpp.dll` file | `Mods` |
| Assembly Replacement Mods | a `GameAssembly.dll` file | the game folder |
| MelonLoader Mods | a `.dll` file built for MelonLoader | `Mods\<ModName>` |
| Asset Replacement Mods | a `.assets` file | `Prodeus_Data` |
| Fallback Installer | anything not matched above | - |

Paths are relative to the game's install folder.

## MelonLoader (mod loader)

This installer handles MelonLoader, not mods for it. It exists so users can install MelonLoader through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `version.dll` in the archive.
- Requires BOTH a folder named `MelonLoader` and the loader file `version.dll`.

Installs to: the game folder

**Common mistakes:**

- If you bundle MelonLoader inside your mod archive, Vortex treats the whole download as MelonLoader rather than as your mod. Ship the mod alone and list MelonLoader as a requirement.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── Prodeus_Data\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `Prodeus_Data` or `Prodeus_Data` in the archive.

Installs to: the game folder

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## MelonLoader Preferences Manager

This installer handles the MelonLoader Preferences Manager, not mods for it. It exists so users can install the MelonLoader Preferences Manager through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `melonprefmanager.il2cpp.dll` in the archive.

Installs to: `Mods`

**Common mistakes:**

- If you bundle the MelonLoader Preferences Manager inside your mod archive, Vortex treats the whole download as the MelonLoader Preferences Manager rather than as your mod. Ship the mod alone and list the MelonLoader Preferences Manager as a requirement.

## Assembly Replacement Mods

Mods that replace a compiled game assembly outright. These overwrite core game files, so they conflict with any other mod touching the same assembly.

**Requirements:**

- Recognised by any file named `GameAssembly.dll`.

Installs to: the game folder

**Common mistakes:**

- Assembly replacements cannot be combined with other assembly mods - state this clearly on the mod page.
- Shipping an assembly alongside a plugin makes the whole archive install as an assembly mod.

## MelonLoader Mods

The normal shape for a MelonLoader mod: a compiled mod DLL. Vortex reads each DLL to tell which mod loader it was built for, so the archive does not need to reproduce the MelonLoader folder structure.

```text
MyMelonMod.zip
└── MyMelonMod.dll
```

**Requirements:**

- Recognised by any `.dll` file that references MelonLoader.
- A loose DLL is put in a folder of its own, named after its folder in the archive or else after the DLL, so files from different mods cannot overwrite each other.
- MelonLoader only loads a mod in its own folder when that folder holds a `manifest.json`, so Vortex writes one when the archive has none.
- A MelonLoader plugin (a DLL that references `MelonPlugin`) goes to `Plugins\<ModName>` instead.
- An archive that already has a `mods`, `plugins`, `userdata` or `userlibs` folder keeps that layout and installs to the game folder.
- An archive whose DLLs reference neither loader installs to the game folder, and Vortex shows a notification asking the user to check the mod page.

Installs to: `Mods\<ModName>`

**Common mistakes:**

- Shipping a plugin together with loader files, which makes the archive look like a loader install instead.

## Asset Replacement Mods

Mods that replace packed Unity asset files, deployed into the game's data folder.

**Requirements:**

- Recognised by any file with the `.assets`, `.resource` or `.ress` extensions.

Installs to: `Prodeus_Data`

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
