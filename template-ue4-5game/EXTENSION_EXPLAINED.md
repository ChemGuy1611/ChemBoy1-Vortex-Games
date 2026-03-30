# XXX — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | XXX Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 2026-XX-XX |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `XXX` |
| Executable | `XXX.exe` |
| Executable (GOG) | `XXX.exe` |
| Executable (Demo) | `XXX.exe` |
| Extension Page | XXX |
| PCGamingWiki | XXX |

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `hasXbox` | `false` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SS Script-LogicMod Combo | `XXX-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `XXX-logicmods` | high | `{gamePath}/XXX/Content/Paks` |
| PAK_ALT_NAME | `PAK_ALT_ID` | high | `{gamePath}/PAK_ALT_PATH` |
| ROOT_NAME | `ROOT_ID` | high | `{gamePath}` |
| ROOTSUB_NAME | `ROOTSUB_ID` | high | `{gamePath}/ROOTSUB_PATH` |

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| UE4SS | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
