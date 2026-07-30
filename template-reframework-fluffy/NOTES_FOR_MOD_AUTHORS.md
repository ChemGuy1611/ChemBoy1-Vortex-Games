# Notes for Mod Authors - template-reframework-fluffy (template)

Packaging rules for template-reframework-fluffy (template) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Fluffy Mod Manager (tool) | a `modmanager.exe` file | - |
| REFramework (mod loader) | a `dinput8.dll` file | - |
| Loose Lua Scripts | a `.lua` file outside the REFramework folders | the game folder itself (no subfolder) |
| Root / Game Folder Mods | a `nvngx_dlss.dll` file or a `.exe` file | the game folder itself (no subfolder) |
| Preset Files | a `.prt` file | - |
| Fluffy-Format Mods | anything not matched above | - |
| XXX Fluffymodzip | a file or folder named `modmanager.exe` and a file or folder named `dinput8.dll` | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Fluffy Mod Manager (tool)

This installer handles Fluffy Mod Manager itself, not mods for it. It exists so users can install Fluffy Mod Manager through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `modmanager.exe` in the archive.

**Common mistakes:**

- If you bundle Fluffy Mod Manager inside your mod archive, Vortex treats the whole download as Fluffy Mod Manager rather than as your mod. Ship the mod alone and list Fluffy Mod Manager as a requirement.

## REFramework (mod loader)

This installer handles REFramework itself, not mods for it. It exists so users can install REFramework through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `dinput8.dll` in the archive.

**Common mistakes:**

- If you bundle REFramework inside your mod archive, Vortex treats the whole download as REFramework rather than as your mod. Ship the mod alone and list REFramework as a requirement.

## Loose Lua Scripts

Standalone REFramework Lua scripts, shipped without the surrounding REFramework folder structure.

**Requirements:**

- Recognised by a `.lua` file in an archive that does NOT already contain a REFramework folder (`reframework` or `autorun`).
- Vortex adds the correct folder structure around the script for you.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Including an REFramework folder as well switches the archive to a different installer, which expects the full structure to already be correct.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

**Requirements:**

- Recognised by any file named `nvngx_dlss.dll`, `dstoragecore.dll`, `dstorage.dll`, `amd_fidelityfx_dx12.dll`, `amd_ags_x64.dll` or `libxess.dll`.
- Recognised by any file with the `.exe` extension.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Preset Files

Configuration presets for REFramework mods.

**Requirements:**

- Recognised by any file with the `.prt` extension.

## Fluffy-Format Mods

The catch-all for RE Engine mods packaged in the normal Fluffy Mod Manager layout. Most content mods for this game land here, which is the intended outcome.

**Requirements:**

- Any archive not claimed by an earlier installer is treated as a Fluffy-format mod.

**Common mistakes:**

- Because this is a catch-all, a badly laid-out archive still installs - it just may not work. Match the layout Fluffy Mod Manager expects.

## XXX Fluffymodzip

Recognised when the archive contains a file or folder named `modmanager.exe` and a file or folder named `dinput8.dll`.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

