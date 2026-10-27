# Notes for Mod Authors - Warhammer 40,000: Rogue Trader

Packaging rules for Warhammer 40,000: Rogue Trader mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Micropatches | a `MicroPatches.dll` file | `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Rogue Trader\UnityModManager` |
| Modfinder | a `ModFinder.exe` file | - |
| Saveeditor | a `Arcemi Save Game Editor.exe` file | - |
| Portraitmanager | a `Portrait Manager Owlcat.exe` file | - |
| Mod | a `owlcatmodificationmanifest.json` file, a `Assemblies`, `Blueprints`, `Bundles` or `Localization` folder and a `.dll` file | `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Rogue Trader\Modifications` |
| Plugin | a `.dll` file | `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Rogue Trader\UnityModManager` |
| Portrait | a `fulllength.png`, `medium.png` or `small.png` file | `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Rogue Trader\Portraits` |
| Save Game Files | a `.zks` file | `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Rogue Trader\Saved Games` |
| Fallback Installer | anything not matched above | `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Rogue Trader` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Micropatches

Recognised when the archive contains a `MicroPatches.dll` file.

Installs to: `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Rogue Trader\UnityModManager`

## Modfinder

Recognised when the archive contains a `ModFinder.exe` file.

## Saveeditor

Recognised when the archive contains a `Arcemi Save Game Editor.exe` file.

## Portraitmanager

Recognised when the archive contains a `Portrait Manager Owlcat.exe` file.

## Mod

Recognised when the archive contains a `owlcatmodificationmanifest.json` file, a `Assemblies`, `Blueprints`, `Bundles` or `Localization` folder and a `.dll` file.

Installs to: `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Rogue Trader\Modifications`

## Plugin

Recognised when the archive contains a `.dll` file.

Installs to: `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Rogue Trader\UnityModManager`

## Portrait

Recognised when the archive contains a `fulllength.png`, `medium.png` or `small.png` file.

Installs to: `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Rogue Trader\Portraits`

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file with the `.zks` extension.

Installs to: `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Rogue Trader\Saved Games`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Fallback Installer

The catch-all. Any archive that matched none of the installers above lands here and is copied across unchanged.

> **NOTE:** Landing in the fallback installer is a signal your archive layout needs fixing.

**Requirements:**

- Reaching this installer usually means the archive was not laid out in a way Vortex recognised.
- Vortex shows the user a notification when a mod installs through the fallback.

Installs to: `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Rogue Trader`

**Common mistakes:**

- If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report the mod as broken.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
