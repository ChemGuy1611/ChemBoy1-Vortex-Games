# Notes for Mod Authors - Warhammer 40,000: Dark Heresy

Packaging rules for Warhammer 40,000: Dark Heresy mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Owlcat Mod | a `owlcatmodificationmanifest.json` file and a `Assemblies`, `Blueprints`, `Bundles` or `Localization` folder | `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Dark Heresy\Modifications` |
| Portraits | a `fulllength.png`, `medium.png` or `small.png` file | `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Dark Heresy\Portraits` |
| Save Game Files | a `.zks` file | `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Dark Heresy\Saved Games` |
| Fallback Installer | anything not matched above | `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Dark Heresy` |

Paths are relative to the game's install folder. Config and save folders are in your user profile, not the game's install folder.

## Owlcat Mod

Recognised when the archive contains a `owlcatmodificationmanifest.json` file and a `Assemblies`, `Blueprints`, `Bundles` or `Localization` folder.

Installs to: `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Dark Heresy\Modifications`

## Portraits

Recognised when the archive contains a `fulllength.png`, `medium.png` or `small.png` file.

Installs to: `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Dark Heresy\Portraits`

## Save Game Files

Save files, deployed to the game's save folder.

**Requirements:**

- Recognised by any file with the `.zks` extension.

Installs to: `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Dark Heresy\Saved Games`

**Common mistakes:**

- Including an example save alongside a normal mod makes the archive install as a save.

## Fallback Installer

The catch-all. Any archive that matched none of the installers above lands here and is copied across unchanged.

> **NOTE:** Landing in the fallback installer is a signal your archive layout needs fixing.

**Requirements:**

- Reaching this installer usually means the archive was not laid out in a way Vortex recognised.
- Vortex shows the user a notification when a mod installs through the fallback.

Installs to: `%USERPROFILE%\AppData\LocalLow\Owlcat Games\Warhammer 40000 Dark Heresy`

**Common mistakes:**

- If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report the mod as broken.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
