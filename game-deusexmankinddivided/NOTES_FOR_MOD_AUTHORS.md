# Notes for Mod Authors - Deus Ex: Mankind Divided

Packaging rules for Deus Ex: Mankind Divided mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Root / Game Folder Mods | a `DLC` folder | the game folder |
| runtime file | a `Game.layer.0.all.archive`, `Game.layer.0.en.archive`, `Game.layer.1.all.archive`, `Game.layer.1.en.archive`, `Game.layer.0.de.archive`, `Game.layer.1.de.archive`, `Game.layer.0.es.archive`, `Game.layer.1.es.archive`, `Game.layer.0.fr.archive`, `Game.layer.1.fr.archive`, `Game.layer.0.it.archive`, `Game.layer.1.it.archive`, `Game.layer.0.mx.archive`, `Game.layer.1.mx.archive`, `Game.layer.0.pt.archive`, `Game.layer.1.pt.archive`, `Game.layer.0.ru.archive` or `Game.layer.1.ru.archive` file | `runtime` |
| DLC runtime file | a `DLC01.layer.0.all.archive`, `DLC02.layer.0.all.archive`, `DLCPackAssault.layer.0.all.archive`, `DLCPackClassic.layer.0.all.archive`, `DLCPackEnforcer.layer.0.all.archive`, `DLCPackIntruder.layer.0.all.archive`, `DLCPackTactical.layer.0.all.archive` or `DLCPreOrder.layer.0.all.archive` file | `DLC\runtime` |
| Binaries (Engine Injector) | a `.dll`, `.exe`, `.asi` or `.addon64` file | `retail` |

Paths are relative to the game's install folder.

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── DLC\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `DLC`, `retail` or `runtime` in the archive.

Installs to: the game folder

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## runtime file

Recognised when the archive contains a `Game.layer.0.all.archive`, `Game.layer.0.en.archive`, `Game.layer.1.all.archive`, `Game.layer.1.en.archive`, `Game.layer.0.de.archive`, `Game.layer.1.de.archive`, `Game.layer.0.es.archive`, `Game.layer.1.es.archive`, `Game.layer.0.fr.archive`, `Game.layer.1.fr.archive`, `Game.layer.0.it.archive`, `Game.layer.1.it.archive`, `Game.layer.0.mx.archive`, `Game.layer.1.mx.archive`, `Game.layer.0.pt.archive`, `Game.layer.1.pt.archive`, `Game.layer.0.ru.archive` or `Game.layer.1.ru.archive` file.

Installs to: `runtime`

## DLC runtime file

Recognised when the archive contains a `DLC01.layer.0.all.archive`, `DLC02.layer.0.all.archive`, `DLCPackAssault.layer.0.all.archive`, `DLCPackClassic.layer.0.all.archive`, `DLCPackEnforcer.layer.0.all.archive`, `DLCPackIntruder.layer.0.all.archive`, `DLCPackTactical.layer.0.all.archive` or `DLCPreOrder.layer.0.all.archive` file.

Installs to: `DLC\runtime`

## Binaries (Engine Injector)

Recognised when the archive contains a `.dll`, `.exe`, `.asi` or `.addon64` file.

Installs to: `retail`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
