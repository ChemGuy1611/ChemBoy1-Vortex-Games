# Rocksmith 2014 Edition REMASTERED — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Rocksmith 2014 Edition REMASTERED Vortex Extension |
| Engine / Structure | Basic Game with Tools & Launchers |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `rocksmith2014editionremastered` |
| Executable | `Rocksmith2014.exe` |

## Supported Stores

- **Steam** — `221680`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `RSMODS_IS_ARCHIVE` | `false` | the tool is distributed as an archive (zip/7z) |
| `RSMODS_IS_INSTALLER` | `true` | the tool is distributed as an installer executable |
| `RSMODS_IS_ELEVATED` | `false` | the tool requires elevated/admin privileges to install |
| `CDLC_IS_ARCHIVE` | `false` | the tool is distributed as an archive (zip/7z) |
| `CDLC_IS_INSTALLER` | `true` | the tool is distributed as an installer executable |
| `CDLC_IS_ELEVATED` | `false` | the tool requires elevated/admin privileges to install |
| `CFSM_IS_ARCHIVE` | `true` | the tool is distributed as an archive (zip/7z) |
| `CFSM_IS_INSTALLER` | `true` | the tool is distributed as an installer executable |
| `CFSM_IS_ELEVATED` | `false` | the tool requires elevated/admin privileges to install |
| `NOCABLE_IS_ARCHIVE` | `true` | the tool is distributed as an archive (zip/7z) |
| `NOCABLE_IS_INSTALLER` | `false` | the tool is distributed as an installer executable |
| `NOCABLE_IS_ELEVATED` | `false` | the tool requires elevated/admin privileges to install |
| `RSASIO_IS_ARCHIVE` | `true` | the tool is distributed as an archive (zip/7z) |
| `RSASIO_IS_INSTALLER` | `false` | the tool is distributed as an installer executable |
| `RSASIO_IS_ELEVATED` | `false` | the tool requires elevated/admin privileges to install |
| `ASIO4ALL_IS_ARCHIVE` | `false` | the tool is distributed as an archive (zip/7z) |
| `ASIO4ALL_IS_INSTALLER` | `true` | the tool is distributed as an installer executable |
| `ASIO4ALL_IS_ELEVATED` | `true` | the tool requires elevated/admin privileges to install |
| `EOF_IS_ARCHIVE` | `true` | the tool is distributed as an archive (zip/7z) |
| `EOF_IS_INSTALLER` | `false` | the tool is distributed as an installer executable |
| `EOF_IS_ELEVATED` | `false` | the tool requires elevated/admin privileges to install |
| `DLCBUILDER_IS_ARCHIVE` | `false` | the tool is distributed as an archive (zip/7z) |
| `DLCBUILDER_IS_INSTALLER` | `true` | the tool is distributed as an installer executable |
| `DLCBUILDER_IS_ELEVATED` | `false` | the tool requires elevated/admin privileges to install |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
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
- ------------------
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
