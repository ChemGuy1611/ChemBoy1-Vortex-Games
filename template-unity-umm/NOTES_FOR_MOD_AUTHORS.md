# Notes for Mod Authors - template-unity-umm (template)

Packaging rules for template-unity-umm (template) mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Root / Game Folder Mods | a `XXX_Data` folder | the game folder itself (no subfolder) |
| Unity Mod Manager (tool) | a `UnityModManager.exe` file | the game folder itself (no subfolder) |
| Unity Mod Manager Mods | an `info.json` file and a `.dll` | `Mods\<ModName>` |
| Assembly Replacement Mods | a `Assembly-CSharp.dll` file | `XXX_Data\Managed` |
| Asset Replacement Mods | a `.assets` file | `XXX_Data` |
| Fallback Installer | anything not matched above | - |

Paths are relative to the game's install folder.

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

## Unity Mod Manager (tool)

This installer handles Unity Mod Manager itself, not mods for it. It exists so users can install Unity Mod Manager through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `UnityModManager.exe` in the archive.
- Vortex reproduces the loader patch the manager would apply itself, so it deploys and purges like any other mod.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- If you bundle Unity Mod Manager inside your mod archive, Vortex treats the whole download as Unity Mod Manager rather than as your mod. Ship the mod alone and list Unity Mod Manager as a requirement.

## Unity Mod Manager Mods

Mods for Unity Mod Manager: a manifest plus the assembly that implements the mod. Each one gets its own folder under `Mods`.

```text
MyUmmMod.zip
├── info.json
└── MyUmmMod.dll
```

**Requirements:**

- Recognised by a file named `info.json` together with a `.dll` beside it.
- The mod folder name comes from the folder wrapping the manifest. A flat archive is named from the `Id` field in `info.json` instead, so keep that field filled in.

Installs to: `Mods\<ModName>`

**Common mistakes:**

- Shipping the manifest without the assembly - the archive is not recognised as a mod.
- Wrapping the mod in an extra `Mods` folder is fine, but a second level of wrapping folders becomes part of the mod folder name.

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

