# Of Ash and Steel — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Of Ash and Steel Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |
| Version | 0.1.1 |
| Date | 2026-01-07 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `ofashandsteel` |
| Executable | `ofAshAndSteelGame.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `ofAshAndSteelGame.exe` |
| Executable (Demo) | `ofAshAndSteelGame.exe` |

## Supported Stores

- **Steam** — `2893820`
- **GOG** — `1113561740`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `hasXbox` | `false` | toggle for Xbox version logic (to unify templates) |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` |  |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SSCOMBO_NAME | `UE4SSCOMBO_ID` | high | `{gamePath}` |
| LOGICMODS_NAME | `LOGICMODS_ID` | high | `{gamePath}/LOGICMODS_PATH` |
| PAK_ALT_NAME | `ofashandsteel-pakalt` | high | `{gamePath}/ofAshAndSteelGame/Content/Paks/~mods` |
| Root Game Folder | `ofashandsteel-root` | high | `{gamePath}` |
| Root Sub-Folders | `ofashandsteel-rootsubfolders` | high | `{gamePath}/ofAshAndSteelGame` |

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| UE4SS | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
