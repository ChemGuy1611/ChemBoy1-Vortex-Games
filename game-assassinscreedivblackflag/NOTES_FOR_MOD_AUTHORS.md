# Notes for Mod Authors - Assassin's Creed IV Black Flag

Packaging rules for Assassin's Creed IV Black Flag mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| AnvilToolkit (tool) | a `anviltoolkit.exe` file | - |
| ResoRep (tool) | a `d3d11.dll` file | - |
| ResoRep Textures | a `.dds` file | `ResoRep\modded` |
| Fixes Package | a `version.dll` file | - |
| DLC Folder Mods | a `dlc_1` folder | - |
| Extracted Forge Content | a `Extracted` folder | - |
| Unpacked .forge Folder | a `<name>.forge` folder | - |
| Unpacked .data Folder | a `<name>.data` folder | - |
| Loose Data Files | a `.data` file | - |
| Forge File Mods | a `.forge` file | - |
| Root / Game Folder Mods | a `videos` folder | the game folder itself (no subfolder) |
| Fallback Installer | anything not matched above | - |

Paths are relative to the game's install folder.

## AnvilToolkit (tool)

This installer handles AnvilToolkit itself, not mods for it. It exists so users can install AnvilToolkit through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `anviltoolkit.exe` in the archive.

**Common mistakes:**

- If you bundle AnvilToolkit inside your mod archive, Vortex treats the whole download as AnvilToolkit rather than as your mod. Ship the mod alone and list AnvilToolkit as a requirement.

## ResoRep (tool)

This installer handles ResoRep itself, not mods for it. It exists so users can install ResoRep through Vortex, and mod authors normally never package this.

**Requirements:**

- Recognised by a file named `d3d11.dll` in the archive.
- Vortex downloads the matching ResoRep package itself and writes its settings file, so this installer normally only ever runs on that automatic download.

**Common mistakes:**

- If you bundle ResoRep inside your mod archive, Vortex treats the whole download as ResoRep rather than as your mod. Ship the mod alone and list ResoRep as a requirement.

## ResoRep Textures

Replacement textures injected at runtime by ResoRep, rather than packed back into a `.forge` archive.

**Requirements:**

- Recognised by any file with the `.dds` extension.

Installs to: `ResoRep\modded`

**Common mistakes:**

- ResoRep must be installed and its DLL in place for these to show up in game; the textures alone do nothing.
- Each texture has to keep the name ResoRep dumped it under, or it replaces nothing.

## Fixes Package

A community fixes package, deployed into the game folder.

**Requirements:**

- Recognised by any file named `version.dll`.

## DLC Folder Mods

Mods laid out as one or more of the game's DLC folders, copied into the game folder with that layout intact.

**Requirements:**

- Recognised by a folder named `dlc_1`, `dlc_2`, `dlc_3`, `dlc_4`, `dlc_5`, `dlc_6`, `dlc_7`, `dlc_8`, `dlc_9` or `dlc_10` in the archive.

**Common mistakes:**

- Zip the DLC folders themselves, not the folder that contains them - an extra level misplaces every file.

## Extracted Forge Content

Unpacked forge content for AnvilToolkit to repack. The mod is not live until the user runs AnvilToolkit and repacks - deploying it in Vortex only stages the files where the toolkit expects them.

**Requirements:**

- Recognised by a folder named `Extracted` in the archive.

**Common mistakes:**

- Content unpacked with an AnvilToolkit older than 1.2.8 cannot be repacked by 1.2.8 or newer, which affects the pre-Unity titles. Repack on the old version first, delete the extracted folder, then unpack again on the new one.

## Unpacked .forge Folder

A whole unpacked `.forge` archive, packaged as a folder named after the archive it came from. It is staged under the extracted-content folder for AnvilToolkit to repack.

**Requirements:**

- Recognised by a folder named `<name>.forge` in the archive.

**Common mistakes:**

- Keep the folder named exactly after the `.forge` archive the content came from, extension included. The name is what tells AnvilToolkit which archive to repack into.

## Unpacked .data Folder

An unpacked `.data` file, packaged as a folder named after it. Nothing in the archive says which `.forge` it belongs in, so Vortex stages it under a placeholder folder and asks the user to rename that folder to the right `.forge` name.

**Requirements:**

- Recognised by a folder named `<name>.data` in the archive.

**Common mistakes:**

- Name the `.forge` archive your content belongs in somewhere the user will see it - the mod page, a readme, or the archive name. They have to type it into the rename prompt, and Vortex cannot work it out from the files.

## Loose Data Files

Individual data files, staged under a placeholder folder for the user to rename to the `.forge` archive they belong in, the same way an unpacked `.data` folder is.

**Requirements:**

- Recognised by any file with the `.data` extension.

**Common mistakes:**

- State which `.forge` archive the files belong in. The user is prompted for that name and has nothing else to go on.

## Forge File Mods

Replacement `.forge` archives, deployed into the game's data folder.

**Requirements:**

- Recognised by any file with the `.forge` extension.

**Common mistakes:**

- Forge files must keep their original names to replace the right archive.
- A forge file belonging to a DLC is routed to that DLC's folder by the `_NN_dlc` segment in its name, so renaming that part of the file name sends it somewhere else. One archive may carry forge files for several DLCs; each is routed on its own.

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
