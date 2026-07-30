# Notes for Mod Authors - Far Cry New Dawn

Packaging rules for Far Cry New Dawn mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Mod Installer (tool) | a `fcmodinstaller.exe` file | `FCModInstaller` |
| Root / Game Folder Mods | a `bin` folder or a `''` file | the game folder itself (no subfolder) |
| Data File Mods | a `.dat` file | `data_final\pc` |
| Binaries | a file with the `.dll` extension | `bin` |
| Mimoda3 | a file or folder named `info.xml` | `FCModInstaller\ModifiedFilesFCND` |
| Mod Installer Mods | a `.a2` file | `FCModInstaller\ModifiedFilesFCND` |
| Xml | a file or folder named `gamerprofile.xml` and a file with the `.xml` extension | `DOCUMENTS\My Games\Far Cry New Dawn\USERID_FOLDER` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Mod Installer (tool)

This installer handles the Far Cry Mod Installer itself, not mods for it. It exists so users can install the Far Cry Mod Installer through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `fcmodinstaller.exe` in the archive.

Installs to: `FCModInstaller`

**Common mistakes:**

- If you bundle the Far Cry Mod Installer inside your mod archive, Vortex treats the whole download as the Far Cry Mod Installer rather than as your mod. Ship the mod alone and list the Far Cry Mod Installer as a requirement.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── bin\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `bin`, `data_final` or `Support` in the archive.
- Recognised by a file named `''`.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Data File Mods

Packed game data replacements.

**Requirements:**

- Recognised by any file with the `.dat` or `.fat` extensions.

Installs to: `data_final\pc`

## Binaries

Recognised when the archive contains a file with the `.dll` extension.

Installs to: `bin`

## Mimoda3

Recognised when the archive contains a file or folder named `info.xml`.

Installs to: `FCModInstaller\ModifiedFilesFCND`

## Mod Installer Mods

Mods packaged for the Far Cry Mod Installer.

**Requirements:**

- Recognised by any file with the `.a2`, `.a3`, `.a4`, `.a5` or `.bin` extensions.

Installs to: `FCModInstaller\ModifiedFilesFCND`

**Common mistakes:**

- These are applied through the Mod Installer tool, not deployed straight into the game.

## Xml

Recognised when the archive contains a file or folder named `gamerprofile.xml` and a file with the `.xml` extension.

Installs to: `DOCUMENTS\My Games\Far Cry New Dawn\USERID_FOLDER`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

