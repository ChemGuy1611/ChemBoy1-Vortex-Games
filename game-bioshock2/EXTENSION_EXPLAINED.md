# BioShock 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | BioShock 2 Remastered Vortex Extension |
| Engine / Structure | UE2/3 TFC |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `bioshock2` |
| Executable | `Bioshock2HD.exe` |

## Supported Stores

- **Steam** — `409720`
- **Epic Games Store** — `b22ce34b4ce0408c97a888554447479b`
- **GOG** — `1482265668`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| TFC Mod | `bioshock2-tfcmod` | high | `{gamePath}/TFCInstaller/Mods` |
| Movies Mod | `bioshock2-movies` | high | `{gamePath}/ContentBaked/pc/BinkMovies` |
| Root Folder | `bioshock2-root` | high | `{gamePath}` |
| Root Sub Folder | `bioshock2-rootsub` | high | `{gamePath}/ContentBaked/pc` |
| Cooked Sub Folder | `bioshock2-cookedsub` | high | `{gamePath}/ContentBaked/pc/BulkContent` |
| TFC Installer | `bioshock2-tfcinstaller` | low | `{gamePath}/.` |
| UPK Explorer | `bioshock2-tfcexplorer` | low | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `bioshock2-tfcinstaller` | 25 |
| `bioshock2-tfcexplorer` | 27 |
| `bioshock2-tfcmod` | 29 |
| `bioshock2-root` | 31 |
| `bioshock2-cookedsub` | 33 |
| `bioshock2-movies` | 35 |
| `bioshock2-binaries` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Build/Final/Bioshock2HD.exe`)
- **Custom Launch** (`Build/FinalEpic/Bioshock2HD.exe`)
- **Custom Launch** (`SP/Builds/Binaries/Bioshock2.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
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
