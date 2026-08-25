# Notes for Mod Authors - AC IV Black Flag

Packaging rules for AC IV Black Flag mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| AnvilToolkit (tool) | a `anviltoolkit.exe` file | - |
| Dlcfolder | a file or folder named one of: `dlc_1`, `dlc_2`, `dlc_3`, `dlc_4`, `dlc_5`, `dlc_6`, `dlc_7`, `dlc_8`, `dlc_9` or `dlc_10` | the game folder itself (no subfolder) |
| Extracted Forge Content | a `Extracted` folder | the game folder itself (no subfolder) |
| Forgefolder | - | the game folder itself (no subfolder) |
| Datafolder | - | the game folder itself (no subfolder) |
| Loose Data Files | a `.data` file | the game folder itself (no subfolder) |
| Resorep | a file or folder named one of: `d3d11.dll` | the game folder itself (no subfolder) |
| Forge File Mods | a `.forge` file | the game folder itself (no subfolder) |
| Root / Game Folder Mods | a `videos` folder | the game folder itself (no subfolder) |
| Resoreptextures | a file with the `.dds` extension | `ResoRep\modded` |

Paths are relative to the game's install folder.

## AnvilToolkit (tool)

This installer handles AnvilToolkit itself, not mods for it. It exists so users can install AnvilToolkit through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `anviltoolkit.exe` in the archive.

**Common mistakes:**

- If you bundle AnvilToolkit inside your mod archive, Vortex treats the whole download as AnvilToolkit rather than as your mod. Ship the mod alone and list AnvilToolkit as a requirement.

## Dlcfolder

Recognised when the archive contains a file or folder named one of: `dlc_1`, `dlc_2`, `dlc_3`, `dlc_4`, `dlc_5`, `dlc_6`, `dlc_7`, `dlc_8`, `dlc_9` or `dlc_10`.

Installs to: the game folder itself (no subfolder)

## Extracted Forge Content

Unpacked forge content for AnvilToolkit to repack.

**Requirements:**

- Recognised by a folder named `Extracted` in the archive.

Installs to: the game folder itself (no subfolder)

## Forgefolder

Handled by the `testForgeFolder` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: the game folder itself (no subfolder)

## Datafolder

Handled by the `testDataFolder` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: the game folder itself (no subfolder)

## Loose Data Files

Individual data files deployed into the game folder.

**Requirements:**

- Recognised by any file with the `.data` extension.

Installs to: the game folder itself (no subfolder)

## Resorep

Recognised when the archive contains a file or folder named one of: `d3d11.dll`.

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

- Recognised by a folder named `videos` or `sounddata` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Resoreptextures

Recognised when the archive contains a file with the `.dds` extension.

Installs to: `ResoRep\modded`

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

