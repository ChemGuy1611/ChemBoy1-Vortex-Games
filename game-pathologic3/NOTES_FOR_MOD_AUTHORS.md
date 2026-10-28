# Notes for Mod Authors - Pathologic 3

Packaging rules for Pathologic 3 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| P2ModLoader | a `P2ModLoader.exe` file | the game folder |
| Mod | a `modinfo.ltx` file, a `Pathologic3_Data` folder and a `.xml` file | `Mods` |
| Root / Game Folder Mods | a `Pathologic3_Data` folder or a `dxgi.dll` file | the game folder |
| Fallback Installer | anything not matched above | the game folder |

Paths are relative to the game's install folder.

## P2ModLoader

Recognised when the archive contains a `P2ModLoader.exe` file.

Installs to: the game folder

## Mod

Recognised when the archive contains a `modinfo.ltx` file, a `Pathologic3_Data` folder and a `.xml` file.

Installs to: `Mods`

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── Pathologic3_Data\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `Pathologic3_Data` or `MonoBleedingEdge` in the archive.
- Recognised by a file named `dxgi.dll`, `version.dll`, `nvngx.dll`, `libxess.dll` or `amd_fidelityfx_dx12.dll`.

Installs to: the game folder

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

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
