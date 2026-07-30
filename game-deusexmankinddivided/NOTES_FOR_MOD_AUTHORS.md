# Notes for Mod Authors - Deus Ex: Mankind Divided

Packaging rules for Deus Ex: Mankind Divided mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Root / Game Folder Mods | a `DLC` folder | the game folder itself (no subfolder) |
| Runtime | a file or folder named one of: `Game.layer.0.all.archive`, `Game.layer.0.en.archive`, `Game.layer.1.all.archive`, `Game.layer.1.en.archive`, `Game.layer.0.de.archive`, `Game.layer.1.de.archive`, `Game.layer.0.es.archive`, `Game.layer.1.es.archive`, `Game.layer.0.fr.archive`, `Game.layer.1.fr.archive`, `Game.layer.0.it.archive`, `Game.layer.1.it.archive`, `Game.layer.0.mx.archive`, `Game.layer.1.mx.archive`, `Game.layer.0.pt.archive`, `Game.layer.1.pt.archive`, `Game.layer.0.ru.archive` or `Game.layer.1.ru.archive` | `runtime` |
| Dlcruntime | a file or folder named one of: `DLC01.layer.0.all.archive`, `DLC02.layer.0.all.archive`, `DLCPackAssault.layer.0.all.archive`, `DLCPackClassic.layer.0.all.archive`, `DLCPackEnforcer.layer.0.all.archive`, `DLCPackIntruder.layer.0.all.archive`, `DLCPackTactical.layer.0.all.archive` or `DLCPreOrder.layer.0.all.archive` | `DLC\runtime` |
| Binaries | a file with one of these extensions: `.dll`, `.exe`, `.asi` or `.addon64` | `retail` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── DLC\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `DLC`, `retail` or `runtime` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Runtime

Recognised when the archive contains a file or folder named one of: `Game.layer.0.all.archive`, `Game.layer.0.en.archive`, `Game.layer.1.all.archive`, `Game.layer.1.en.archive`, `Game.layer.0.de.archive`, `Game.layer.1.de.archive`, `Game.layer.0.es.archive`, `Game.layer.1.es.archive`, `Game.layer.0.fr.archive`, `Game.layer.1.fr.archive`, `Game.layer.0.it.archive`, `Game.layer.1.it.archive`, `Game.layer.0.mx.archive`, `Game.layer.1.mx.archive`, `Game.layer.0.pt.archive`, `Game.layer.1.pt.archive`, `Game.layer.0.ru.archive` or `Game.layer.1.ru.archive`.

Installs to: `runtime`

## Dlcruntime

Recognised when the archive contains a file or folder named one of: `DLC01.layer.0.all.archive`, `DLC02.layer.0.all.archive`, `DLCPackAssault.layer.0.all.archive`, `DLCPackClassic.layer.0.all.archive`, `DLCPackEnforcer.layer.0.all.archive`, `DLCPackIntruder.layer.0.all.archive`, `DLCPackTactical.layer.0.all.archive` or `DLCPreOrder.layer.0.all.archive`.

Installs to: `DLC\runtime`

## Binaries

Recognised when the archive contains a file with one of these extensions: `.dll`, `.exe`, `.asi` or `.addon64`.

Installs to: `retail`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

