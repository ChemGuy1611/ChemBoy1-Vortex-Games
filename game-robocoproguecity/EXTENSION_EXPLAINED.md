# RoboCop: Rogue City — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | RoboCop Rogue City and Unfinished Business Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `robocoproguecity` |
| Executable | `RoboCop.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `1681430`
- **GOG** — `1950574400`
- **Xbox / Microsoft Store** — `BigbenInteractiveSA.RoboCopRogueCity`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `CHECK_DATA_UNFINISHED` | `false` |  |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `robocoproguecity-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `robocoproguecity-logicmods` | high | `{gamePath}/Game/Content/Paks/LogicMods` |
| Root Game Folder | `robocoproguecity-root` | high | `{gamePath}` |
| Content Folder | `robocoproguecity-contentfolder` | high | `{gamePath}/Game` |
| UE5 Paks (no "~mods") | `robocoproguecity-pakalt` | high | `{gamePath}/Game/Content/Paks` |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder
- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex links/copies to game folder
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
