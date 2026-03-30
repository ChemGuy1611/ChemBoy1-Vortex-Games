# Keeper — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Keeper Vortex Extension |
| Engine / Structure | UE5 (Xbox-Integrated) |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 2025-10-22 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `keeper` |
| Executable | `Keeper.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Keeper.exe` |

## Supported Stores

- **Steam** — `3043580`
- **Xbox / Microsoft Store** — `Microsoft.PaganIdol`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` |  |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SS Script-LogicMod Combo | `keeper-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `keeper-logicmods` | high | `{gamePath}/PaganIdol/Content/Paks/LogicMods` |
| Root Game Folder | `keeper-root` | high | `{gamePath}` |
| Content Folder | `keeper-contentfolder` | high | `{gamePath}/PaganIdol` |
| Paks (no "~mods") | `keeper-pakalt` | high | `{gamePath}/PaganIdol/Content/Paks` |

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| UE4SS | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
