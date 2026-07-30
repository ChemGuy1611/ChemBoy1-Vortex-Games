# Notes for Mod Authors - AC Shadows

Packaging rules for AC Shadows mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| AnvilToolkit (tool) | a `anviltoolkit.exe` file | - |
| Forgerpatchmanager | a file or folder named `forger.exe` and a file or folder named `forger mod.exe` | - |
| Dlcfolder | a file or folder named one of: `dlc_10`, `dlc_26`, `dlc_28` or `dlc_29` | the game folder itself (no subfolder) |
| Forge File Mods | a `.forge` file | the game folder itself (no subfolder) |
| Root / Game Folder Mods | a `videos` folder | the game folder itself (no subfolder) |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## AnvilToolkit (tool)

This installer handles AnvilToolkit itself, not mods for it. It exists so users can install AnvilToolkit through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `anviltoolkit.exe` in the archive.

**Common mistakes:**

- If you bundle AnvilToolkit inside your mod archive, Vortex treats the whole download as AnvilToolkit rather than as your mod. Ship the mod alone and list AnvilToolkit as a requirement.

## Forgerpatchmanager

Recognised when the archive contains a file or folder named `forger.exe` and a file or folder named `forger mod.exe`.

## Dlcfolder

Recognised when the archive contains a file or folder named one of: `dlc_10`, `dlc_26`, `dlc_28` or `dlc_29`.

Installs to: the game folder itself (no subfolder)

## Forge File Mods

Replacement `.forge` archives, deployed into the game's data folder.

**Requirements:**

- Recognised by any file with the `.forge` extension.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Forge files must keep their original names to replace the right archive.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── videos\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `videos` or `resources` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

