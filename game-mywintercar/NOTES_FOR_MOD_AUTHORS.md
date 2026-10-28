# Notes for Mod Authors - My Winter Car

Packaging rules for My Winter Car mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| MSCLoader | a `MSCLInstaller.exe` file | the game folder |
| BepInEx (mod loader) | a `BepInEx.dll` file | the game folder |
| MelonLoader (mod loader) | a `MelonLoader.dll` file | the game folder |
| Root Game Folder | a `mywintercar_Data` folder | the game folder |
| BepInEx Configuration Manager | a `configurationmanager.dll` file | `BepInEx` |
| MelonLoader Preferences Manager | a `melonprefmanager.mono.dll` file | `Mods` |
| Assembly Replacement Mods | a `Assembly-CSharp.dll` file | `mywintercar_Data\Managed` |
| BepInEx Plugin Mods | a `.dll` file built for BepInEx | `BepInEx\plugins` |
| MelonLoader Mods | a `.dll` file built for MelonLoader | `Mods` |
| Asset Replacement Mods | a `.assets` file | `mywintercar_Data` |
| Texture Pack (MSCLoader) | a `packinfo.json` file | `Mods\Assets\TexturePackLoader` |
| Fallback Installer | anything not matched above | the game folder |

Paths are relative to the game's install folder.

## MSCLoader

Recognised when the archive contains a `MSCLInstaller.exe` file.

Installs to: the game folder

## BepInEx (mod loader)

This installer handles BepInEx, not mods for it. It exists so users can install BepInEx through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `BepInEx.dll` in the archive.
- Requires BOTH a folder named `BepInEx` and the loader file `BepInEx.dll`.

Installs to: the game folder

**Common mistakes:**

- If you bundle BepInEx inside your mod archive, Vortex treats the whole download as BepInEx rather than as your mod. Ship the mod alone and list BepInEx as a requirement.

## MelonLoader (mod loader)

This installer handles MelonLoader, not mods for it. It exists so users can install MelonLoader through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `MelonLoader.dll` in the archive.
- Requires BOTH a folder named `MelonLoader` and the loader file `MelonLoader.dll`.

Installs to: the game folder

**Common mistakes:**

- If you bundle MelonLoader inside your mod archive, Vortex treats the whole download as MelonLoader rather than as your mod. Ship the mod alone and list MelonLoader as a requirement.

## Root Game Folder

Recognised when the archive contains a `mywintercar_Data` folder.

Installs to: the game folder

## BepInEx Configuration Manager

This installer handles the BepInEx Configuration Manager plugin, not mods for it. It exists so users can install the BepInEx Configuration Manager plugin through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `configurationmanager.dll` in the archive.
- Requires the file `configurationmanager.dll` together with a `plugins` folder.

Installs to: `BepInEx`

**Common mistakes:**

- If you bundle the BepInEx Configuration Manager plugin inside your mod archive, Vortex treats the whole download as the BepInEx Configuration Manager plugin rather than as your mod. Ship the mod alone and list the BepInEx Configuration Manager plugin as a requirement.

## MelonLoader Preferences Manager

This installer handles the MelonLoader Preferences Manager, not mods for it. It exists so users can install the MelonLoader Preferences Manager through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `melonprefmanager.mono.dll` in the archive.

Installs to: `Mods`

**Common mistakes:**

- If you bundle the MelonLoader Preferences Manager inside your mod archive, Vortex treats the whole download as the MelonLoader Preferences Manager rather than as your mod. Ship the mod alone and list the MelonLoader Preferences Manager as a requirement.

## Assembly Replacement Mods

Mods that replace a compiled game assembly outright. These overwrite core game files, so they conflict with any other mod touching the same assembly.

**Requirements:**

- Recognised by any file named `Assembly-CSharp.dll` or `Assembly-CSharp-firstpass.dll`.

Installs to: `mywintercar_Data\Managed`

**Common mistakes:**

- Assembly replacements cannot be combined with other assembly mods - state this clearly on the mod page.
- Shipping an assembly alongside a plugin makes the whole archive install as an assembly mod.

## BepInEx Plugin Mods

The normal shape for a BepInEx mod: a compiled plugin DLL. Vortex reads each DLL to tell which mod loader it was built for, so the archive does not need to reproduce the BepInEx folder structure.

```text
MyPlugin.zip
└── MyPlugin.dll
```

**Requirements:**

- Recognised by any `.dll` file that references BepInEx.
- A preloader patcher (a DLL that references `BaseUnityPlugin`) goes to `BepInEx\patchers` instead.
- An archive that already has a `plugins`, `patchers` or `config` folder keeps that layout and installs to `BepInEx`.

Installs to: `BepInEx\plugins`

**Common mistakes:**

- Shipping a plugin together with loader files, which makes the archive look like a loader install instead.
- Putting BepInEx and MelonLoader plugins in one archive. Vortex cannot install both kinds together - publish them as separate files.

## MelonLoader Mods

The normal shape for a MelonLoader mod: a compiled mod DLL. Vortex reads each DLL to tell which mod loader it was built for, so the archive does not need to reproduce the MelonLoader folder structure.

```text
MyMelonMod.zip
└── MyMelonMod.dll
```

**Requirements:**

- Recognised by any `.dll` file that references MelonLoader.
- A MelonLoader plugin (a DLL that references `MelonPlugin`) goes to `Plugins` instead.
- An archive that already has a `mods`, `plugins`, `userdata` or `userlibs` folder keeps that layout and installs to the game folder.
- An archive whose DLLs reference neither loader installs to the game folder, and Vortex shows a notification asking the user to check the mod page.

Installs to: `Mods`

**Common mistakes:**

- Shipping a plugin together with loader files, which makes the archive look like a loader install instead.
- Putting BepInEx and MelonLoader plugins in one archive. Vortex cannot install both kinds together - publish them as separate files.

## Asset Replacement Mods

Mods that replace packed Unity asset files, deployed into the game's data folder.

**Requirements:**

- Recognised by any file with the `.assets`, `.resource` or `.ress` extensions.

Installs to: `mywintercar_Data`

**Common mistakes:**

- Asset files must keep their original names to replace the right bundle.

## Texture Pack (MSCLoader)

Recognised when the archive contains a `packinfo.json` file.

Installs to: `Mods\Assets\TexturePackLoader`

## Fallback Installer

The catch-all. Any archive that matched none of the installers above lands here and is copied across unchanged.

> **NOTE:** Landing in the fallback installer is a signal your archive layout needs fixing.

**Requirements:**

- Reaching this installer usually means the archive was not laid out in a way Vortex recognised.
- Vortex shows the user a notification when a mod installs through the fallback.

Installs to: the game folder

**Common mistakes:**

- If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report the mod as broken.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
