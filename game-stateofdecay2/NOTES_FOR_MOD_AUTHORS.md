# Notes for Mod Authors - State of Decay 2

Packaging rules for State of Decay 2 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Modmanager | a file or folder named `modintegrator.exe` | - |
| Config | - | `{localAppData}\StateOfDecay2\Saved\Config\WindowsNoEditor` |
| Cooked | a file or folder named `Cooked` | `{localAppData}\StateOfDecay2\Saved` |
| Root / Game Folder Mods | a top-level folder such as `StateOfDecay2` | the game folder itself (no subfolder) |
| Fallback Installer | anything unrecognised with no pak file | - |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Modmanager

Recognised when the archive contains a file or folder named `modintegrator.exe`.

## Config

Handled by the `testConfig` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: `{localAppData}\StateOfDecay2\Saved\Config\WindowsNoEditor`

## Cooked

Recognised when the archive contains a file or folder named `Cooked`.

Installs to: `{localAppData}\StateOfDecay2\Saved`

## Root / Game Folder Mods

For mods that replace or add files inside the game installation, laid out the same way they appear in the game folder.

```text
MyRootMod.zip
└── StateOfDecay2\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a top-level folder matching any of: `StateOfDecay2`.
- The matched folder and everything below it is copied into the game folder, preserving structure.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders instead of the game folders themselves adds an extra level and misplaces every file.

## Fallback Installer

This is the catch-all. Any archive with no `.pak` file that matched none of the installers above lands here and is copied, unchanged, into the game's binaries folder.

> **NOTE:** Landing in the fallback installer is a signal your archive layout needs fixing.

**Requirements:**

- Reaching this installer usually means the archive was not laid out in a way Vortex recognised.
- Vortex shows the user a notification when a mod installs through the fallback.

**Common mistakes:**

- If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report it as broken.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

