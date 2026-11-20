# Notes for Mod Authors - Red Dead Redemption 2

Packaging rules for Red Dead Redemption 2 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Add-ons (Translations and Compatibility Files) | files that replace files of an installed mod from the same Nexus Mods page | that mod's folder, overriding its files |
| Lenny's Mod Loader | a `vfs.asi` file | the game folder |
| ScriptHookRDR2 | a `scripthookrdr2.dll` file | the game folder |
| Root / Game Folder Mods | a `x64`, `lml`, `RampageFiles` or `reshade-shaders` folder | the game folder |
| ASI Loader | a `dinput8.dll` or `version.dll` file | the game folder |
| ASI Plugin | - | the game folder |
| LML Mod | a `install.xml` file and a `.ytd`, `.ydr`, `.ydd`, `.yft`, `.ymt`, `.ymap`, `.ytyp`, `.ybn`, `.awc`, `.meta`, `.ymf`, `.yld` or `.gxt2` file | `lml` |
| Fallback Installer | anything not matched above | the game folder |

Paths are relative to the game's install folder.

## Add-ons (Translations and Compatibility Files)

A translation or compatibility file uploaded beside a mod on its Nexus Mods page installs into that mod's own folder, over the file it replaces. Vortex reads the Nexus mod id of the download and looks for an installed mod with the same id.

**Requirements:**

- Every file in the archive (readmes and images aside) must have the same name as a file of the installed mod, either at the same relative path or as the only file with that name. One unmatched file and the archive is installed by the other installers instead.
- The add-on takes the installed mod's mod type and is deployed after it, so its files win.
- An archive with a `.asi`, `.dll` or `.exe` file or an `install.xml` is a main file or an update, never an add-on.

Installs to: that mod's folder, overriding its files

**Common mistakes:**

- Upload the add-on on the same Nexus Mods page as the mod it belongs to, and keep the file names identical to the ones it replaces (`Lang.dat`, `prompts.gxt2`).
- If the mod is not installed yet, the add-on installs by the usual rules, usually to the game folder. Install the mod first.

## Lenny's Mod Loader

Recognised when the archive contains a `vfs.asi` file.

Installs to: the game folder

## ScriptHookRDR2

Recognised when the archive contains a `scripthookrdr2.dll` file.

Installs to: the game folder

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── x64\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `x64`, `lml`, `RampageFiles` or `reshade-shaders` in the archive.

Installs to: the game folder

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## ASI Loader

Recognised when the archive contains a `dinput8.dll` or `version.dll` file.

Installs to: the game folder

## ASI Plugin

Handled by the `testAsiPlugin` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: the game folder

## LML Mod

Recognised when the archive contains a `install.xml` file and a `.ytd`, `.ydr`, `.ydd`, `.yft`, `.ymt`, `.ymap`, `.ytyp`, `.ybn`, `.awc`, `.meta`, `.ymf`, `.yld` or `.gxt2` file.

Installs to: `lml`

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
