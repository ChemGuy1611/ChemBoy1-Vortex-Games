# Rocksmith 2014 Edition REMASTERED — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Rocksmith 2014 Edition REMASTERED Vortex Extension |
| Engine / Structure | Basic Game with Tools & Launchers |
| Author | ChemBoy1 |
| Version | 0.2.1 |
| Date | 2025-10-21 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `rocksmith2014editionremastered` |
| Executable | `Rocksmith2014.exe` |

## Supported Stores

- **Steam** — `221680`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `RSMODS_IS_ARCHIVE` | `false` |  |
| `RSMODS_IS_INSTALLER` | `true` |  |
| `RSMODS_IS_ELEVATED` | `false` |  |
| `CDLC_IS_ARCHIVE` | `false` |  |
| `CDLC_IS_INSTALLER` | `true` |  |
| `CDLC_IS_ELEVATED` | `false` |  |
| `CFSM_IS_ARCHIVE` | `true` |  |
| `CFSM_IS_INSTALLER` | `true` |  |
| `CFSM_IS_ELEVATED` | `false` |  |
| `NOCABLE_IS_ARCHIVE` | `true` |  |
| `NOCABLE_IS_INSTALLER` | `false` |  |
| `NOCABLE_IS_ELEVATED` | `false` |  |
| `RSASIO_IS_ARCHIVE` | `true` |  |
| `RSASIO_IS_INSTALLER` | `false` |  |
| `RSASIO_IS_ELEVATED` | `false` |  |
| `ASIO4ALL_IS_ARCHIVE` | `false` |  |
| `ASIO4ALL_IS_INSTALLER` | `true` |  |
| `ASIO4ALL_IS_ELEVATED` | `true` |  |
| `EOF_IS_ARCHIVE` | `true` |  |
| `EOF_IS_INSTALLER` | `false` |  |
| `EOF_IS_ELEVATED` | `false` |  |
| `DLCBUILDER_IS_ARCHIVE` | `false` |  |
| `DLCBUILDER_IS_INSTALLER` | `true` |  |
| `DLCBUILDER_IS_ELEVATED` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| CDLC Mod | `rocksmith2014editionremastered-cdlcmod` | high | `{gamePath}/dlc` |
| NoCableLauncher | `rocksmith2014editionremastered-nocable` | high | `{gamePath}` |
| RS ASIO | `rocksmith2014editionremastered-rsasio` | high | `{gamePath}` |
| Editor On Fire | `rocksmith2014editionremastered-eof` | high | `{gamePath}/EditorOnFire` |
| Root Game Folder | `rocksmith2014editionremastered-root` | high | `{gamePath}` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download RSMods
- Download CDLC Enabler
- Download CustomsForge Song Manager
- Download NoCableLauncher
- Download RS_ASIO
- Download ASIO4ALL
- Download Editor On Fire
- Download DLC Builder
- Open Downloads Folder

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

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
