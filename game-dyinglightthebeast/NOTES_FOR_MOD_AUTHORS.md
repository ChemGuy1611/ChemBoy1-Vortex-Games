# Notes for Mod Authors - Dying Light The Beast

Packaging rules for Dying Light The Beast mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Mergerutility | - | `ph_ft` |
| Supermerger | - | `ph_ft` |
| Pak | a file with the `.pak` extension | `ph_ft\mods` |
| Root / Game Folder Mods | a `ph_ft` folder | the game folder itself (no subfolder) |
| Binaries | a file with the `.pak` extension | `ph_ft\work\bin\x64` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Mergerutility

Handled by the `testMergerUtility` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: `ph_ft`

## Supermerger

Handled by the `testSuperMerger` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: `ph_ft`

## Pak

Recognised when the archive contains a file with the `.pak` extension.

Installs to: `ph_ft\mods`

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── ph_ft\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `ph_ft` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Binaries

Recognised when the archive contains a file with the `.pak` extension.

Installs to: `ph_ft\work\bin\x64`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

