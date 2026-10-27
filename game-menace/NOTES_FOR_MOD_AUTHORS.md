# Notes for Mod Authors - MENACE

Packaging rules for MENACE mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| MelonLoader (mod loader) | a `MelonLoader.dll` file | the game folder |
| Modkit | a `Menace.Modkit.App.exe` file | the game folder |
| Jiangyu Loader | a `Jiangyu.Loader.dll` file | `Mods` |
| Jiangyu Mods | a `jiangyu.json` file | `Mods` |
| Modpackloader | a `Menace.ModpackLoader.dll` file and a `UserLibs` folder | the game folder |
| Modpackmod | a `modpack.json` file | `Mods` |
| Root / Game Folder Mods | a `Menace_Data` folder | the game folder |
| Assembly Replacement Mods | a `GameAssembly.dll` file | the game folder |
| MelonLoader Preferences Manager | a `melonprefmanager.il2cpp.dll` file | `Mods` |
| Customleadersplugin | a `MenaceCustomLeader.dll` file | `Mods` |
| MelonLoader Mods | a `.dll` file built for MelonLoader | `Mods\<ModName>` |
| Customleaders | - | `Mods\customleaders` |
| Asset Replacement Mods | a `.assets` file | `Menace_Data` |
| Fallback Installer | anything not matched above | - |

Paths are relative to the game's install folder.

## MelonLoader (mod loader)

This installer handles MelonLoader, not mods for it. It exists so users can install MelonLoader through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `MelonLoader.dll` in the archive.
- Requires BOTH a folder named `MelonLoader` and the loader file `MelonLoader.dll`.

Installs to: the game folder

**Common mistakes:**

- If you bundle MelonLoader inside your mod archive, Vortex treats the whole download as MelonLoader rather than as your mod. Ship the mod alone and list MelonLoader as a requirement.

## Modkit

Recognised when the archive contains a `Menace.Modkit.App.exe` file.

Installs to: the game folder

## Jiangyu Loader

This installer handles the Jiangyu loader, not mods for it. It exists so users can install the Jiangyu loader through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `Jiangyu.Loader.dll` in the archive.
- Vortex downloads and installs the loader on its own, so this installer only comes into play for a copy the user downloaded by hand from a mod page.

Installs to: `Mods`

**Common mistakes:**

- If you bundle the Jiangyu loader inside your mod archive, Vortex treats the whole download as the Jiangyu loader rather than as your mod. Ship the mod alone and list the Jiangyu loader as a requirement.

## Jiangyu Mods

A Jiangyu mod is a folder with a `jiangyu.json` manifest at its root, exactly as `jiangyu package` produces it. Ship that folder inside the archive, or the manifest and its files at the top level - both are handled.

```text
MyMod.zip
└── MyMod
    ├── jiangyu.json
    ├── assets
    ├── compiled
    └── templates
```

**Requirements:**

- Recognised by any file named `jiangyu.json`.

Installs to: `Mods`

**Common mistakes:**

- The `name` in `jiangyu.json` decides the folder your mod is installed into, and is what other mods list in `depends`. Keep it stable between releases - changing it makes existing dependencies stop resolving.
- Vortex adds a numbered prefix to that folder so the load order page can reorder your mod. Do not rely on the folder name in any path inside your mod.

## Modpackloader

Recognised when the archive contains a `Menace.ModpackLoader.dll` file and a `UserLibs` folder.

Installs to: the game folder

## Modpackmod

Recognised when the archive contains a `modpack.json` file.

Installs to: `Mods`

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── Menace_Data\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `Menace_Data` or `Menace_Data` in the archive.

Installs to: the game folder

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Assembly Replacement Mods

Mods that replace a compiled game assembly outright. These overwrite core game files, so they conflict with any other mod touching the same assembly.

**Requirements:**

- Recognised by any file named `GameAssembly.dll`.

Installs to: the game folder

**Common mistakes:**

- Assembly replacements cannot be combined with other assembly mods - state this clearly on the mod page.
- Shipping an assembly alongside a plugin makes the whole archive install as an assembly mod.

## MelonLoader Preferences Manager

This installer handles the MelonLoader Preferences Manager, not mods for it. It exists so users can install the MelonLoader Preferences Manager through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `melonprefmanager.il2cpp.dll` in the archive.

Installs to: `Mods`

**Common mistakes:**

- If you bundle the MelonLoader Preferences Manager inside your mod archive, Vortex treats the whole download as the MelonLoader Preferences Manager rather than as your mod. Ship the mod alone and list the MelonLoader Preferences Manager as a requirement.

## Customleadersplugin

Recognised when the archive contains a `MenaceCustomLeader.dll` file.

Installs to: `Mods`

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

## Customleaders

Handled by the `testCustomLeaders` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: `Mods\customleaders`

## Asset Replacement Mods

Mods that replace packed Unity asset files, deployed into the game's data folder.

**Requirements:**

- Recognised by any file with the `.assets`, `.resource` or `.ress` extensions.

Installs to: `Menace_Data`

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
