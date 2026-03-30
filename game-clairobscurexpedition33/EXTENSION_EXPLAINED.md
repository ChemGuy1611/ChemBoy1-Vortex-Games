# Clair Obscur: Expedition 33 — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Clair Obscur: Expedition 33 Vortex Extension |
| Engine / Structure | UE5 (Xbox-Integrated) |
| Author | ChemBoy1 |
| Version | 0.2.1 |
| Date | 2026-02-03 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `clairobscurexpedition33` |
| Executable | `N/A` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `SandFallGOG.exe` |

## Supported Stores

- **Steam** — `1903340`
- **Epic Games Store** — `f18fc860e6b4419e89147983bf769723`
- **GOG** — `2125022825`
- **Xbox / Microsoft Store** — `KeplerInteractive.Expedition33`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `CHECK_DATA` | `false` |  |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SS Script-LogicMod Combo | `clairobscurexpedition33-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `clairobscurexpedition33-logicmods` | high | `{gamePath}/Sandfall/Content/Paks/LogicMods` |
| Root Game Folder | `clairobscurexpedition33-root` | high | `{gamePath}` |
| Content Folder | `clairobscurexpedition33-contentfolder` | high | `{gamePath}/Sandfall` |
| UE5_ALT_NAME | `clairobscurexpedition33-pakalt` | high | `{gamePath}/Sandfall/Content/Paks` |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open UE4SS Settings INI
- Open UE4SS mods.json
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

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
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
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
