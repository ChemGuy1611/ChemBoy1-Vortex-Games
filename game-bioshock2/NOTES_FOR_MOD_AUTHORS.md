# Notes for Mod Authors - BioShock 2 Remastered

Packaging rules for BioShock 2 Remastered mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| TFC Installer (tool) | a `tfcinstaller.exe` file | the game folder itself (no subfolder) |
| UPK Explorer (tool) | a `upk explorer.exe` file | the game folder itself (no subfolder) |
| TFC Mods | a `gameprofile.xml` file or a `.packagepatch` file | `TFCInstaller\Mods` |
| Root / Game Folder Mods | a `ContentBaked` folder | the game folder itself (no subfolder) |
| Cooked Content Mods | a `.blk` file | `ContentBaked\pc\BulkContent` |
| Movie / Cutscene Replacements | a `.bik` file | `ContentBaked\pc\BinkMovies` |
| Binaries / Injector Mods | a `Bioshock2HD.exe` file or a `.dll` file | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## TFC Installer (tool)

This installer handles the TFC Installer itself, not mods for it. It exists so users can install the TFC Installer through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `tfcinstaller.exe` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- If you bundle the TFC Installer inside your mod archive, Vortex treats the whole download as the TFC Installer rather than as your mod. Ship the mod alone and list the TFC Installer as a requirement.

## UPK Explorer (tool)

This installer handles UPK Explorer itself, not mods for it. It exists so users can install UPK Explorer through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `upk explorer.exe` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- If you bundle UPK Explorer inside your mod archive, Vortex treats the whole download as UPK Explorer rather than as your mod. Ship the mod alone and list UPK Explorer as a requirement.

## TFC Mods

Texture/content mods handled through the TFC system.

**Requirements:**

- Recognised by any file named `gameprofile.xml`, `gameprofile.idremappings.xml`, `objectdescriptors.xml`, `packageextensions.xml`, `texturepack` or `game`.
- Recognised by any file with the `.packagepatch`, `.descriptor`, `.tfcmapping` or `.inipatch` extensions.

Installs to: `TFCInstaller\Mods`

**Common mistakes:**

- Keep the original file names - the TFC system matches them by name.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── ContentBaked\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `ContentBaked`, `BinkMovies`, `BulkContent`, `FlashMovies`, `Maps`, `Sounds_Windows` or `System` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Cooked Content Mods

Packaged content deployed into the game's cooked content folder.

**Requirements:**

- Recognised by any file with the `.blk` extension.

Installs to: `ContentBaked\pc\BulkContent`

## Movie / Cutscene Replacements

Replacement video files, deployed into the game's movies folder.

**Requirements:**

- Recognised by any file with the `.bik` extension.

Installs to: `ContentBaked\pc\BinkMovies`

**Common mistakes:**

- The replacement must keep the original file name, or the game will not pick it up.

## Binaries / Injector Mods

DLL injectors and other files that belong next to the game executable.

**Requirements:**

- Recognised by any file named `Bioshock2HD.exe` or `Bioshock2.exe`.
- Recognised by any file with the `.dll` extension.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

