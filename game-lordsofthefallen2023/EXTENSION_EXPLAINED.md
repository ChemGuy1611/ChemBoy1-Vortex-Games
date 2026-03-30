# Lords of the Fallen (2023) — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Lords of the Fallen (2023) Vortex Extension |
| Engine / Structure | UE5 (Xbox-Integrated) |
| Author | ChemBoy1 |
| Version | 0.2.0 |
| Date | 2026-02-01 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `lordsofthefallen2023` |
| Executable | `N/A` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `1501750`
- **Epic Games Store** — `ce98de7d9e9c47ea8d9ba8e46a5063b4`
- **Xbox / Microsoft Store** — `CIGamesS.A.LordsoftheFallen-PC`

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
| UE4SS Script-LogicMod Combo | `lordsofthefallen2023-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `lordsofthefallen2023-logicmods` | high | `{gamePath}/LOTF2/Content/Paks/LogicMods` |
| Root Game Folder | `lordsofthefallen2023-root` | high | `{gamePath}` |
| Content Folder | `lordsofthefallen2023-contentfolder` | high | `{gamePath}/LOTF2` |
| UE5_ALT_NAME | `lordsofthefallen2023-pakalt` | high | `{gamePath}/LOTF2/Content/Paks` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `lordsofthefallen2023-ue4sscombo` | 25 |
| `lordsofthefallen2023-logicmods` | 27 |
| `lordsofthefallen2023-ue4ss` | 31 |
| `lordsofthefallen2023-scripts` | 33 |
| `lordsofthefallen2023-ue4ssdll` | 35 |
| `lordsofthefallen2023-root` | 37 |
| `lordsofthefallen2023-contentfolder` | 39 |
| `lordsofthefallen2023-config` | 41 |
| `lordsofthefallen2023-binaries` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS

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
