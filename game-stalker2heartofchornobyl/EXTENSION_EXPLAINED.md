# S.T.A.L.K.E.R. 2 \tHeart of Chornobyl — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | S.T.A.L.K.E.R. 2: Heart of Chornobyl Vortex Extension |
| Engine / Structure | UE5 (Xbox-Integrated) |
| Author | ChemBoy1 |
| Version | 0.5.4 |
| Date | 2026-02-04 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `stalker2heartofchornobyl` |
| Executable | `Stalker2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Stalker2.exe` |

## Supported Stores

- **Steam** — `1643320`
- **Epic Games Store** — `c04ba25a0e674b1ab3ea79e50c24a722`
- **GOG** — `1529799785`
- **Xbox / Microsoft Store** — `GSCGameWorld.S.T.A.L.K.E.R.2HeartofChernobyl`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `CHECK_CONFIG` | `false` |  |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SS LogicMods (Blueprint) | `stalker2heartofchornobyl-logicmods` | high | `{gamePath}/Stalker2/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `stalker2heartofchornobyl-ue4sscombo` | high | `{gamePath}` |
| Root Game Folder | `stalker2heartofchornobyl-root` | high | `{gamePath}` |
| UE5 Paks | `stalker2heartofchornobyl-ue5` | high | `{gamePath}/Stalker2/Content/Paks/~mods` |
| UE5 Paks (no ~mods) | `stalker2heartofchornobyl-pakalt` | high | `{gamePath}/Stalker2/Content/Paks` |
| Herbata Mod (GameLite) | `stalker2heartofchornobyl-herbatamod` | high | `{gamePath}/Stalker2/Content` |
| Simple Mod Merger | `stalker2heartofchornobyl-merger` | low | `{gamePath}/Stalker2SimpleModMerger` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `stalker2heartofchornobyl-merger` | 25 |
| `stalker2heartofchornobyl-ue4sscombo` | 29 |
| `stalker2heartofchornobyl-logicmods` | 31 |
| `stalker2heartofchornobyl-herbatamod` | 33 |
| `stalker2heartofchornobyl-ue4ss` | 37 |
| `stalker2heartofchornobyl-scripts` | 39 |
| `stalker2heartofchornobyl-ue4ssdll` | 41 |
| `stalker2heartofchornobyl-root` | 43 |
| `stalker2heartofchornobyl-config` | 45 |
| `stalker2heartofchornobyl-save` | 47 |
| `stalker2heartofchornobyl-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Stalker2.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)
- **Simple Mod Merger**
- **Herbata**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Steam Workshop Mods Folder
- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open GameLite (Herbata) Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS
- Download Simple Mod Merger
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
