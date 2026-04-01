# Street Fighter 6 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Street Fighter 6 Vortex Extension |
| Engine / Structure | 3rd Party Mod Manager (Fluffy) |
| Author | ChemBoy1 |

### Notes

- Exe name same in demo version - different Fluffy folder name

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `streetfighter6` |
| Executable | `StreetFighter6.exe` |
| Executable (Demo) | `StreetFighter6.exe` |

## Supported Stores

- **Steam** — `1364780`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `streetfighter6-root` | high | `{gamePath}` |
| Fluffy Mod Manager | `streetfighter6-fluffymodmanager` | low | `{gamePath}` |
| REFramework | `streetfighter6-reframework` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `streetfighter6-fluffymodmanager` | 25 |
| `streetfighter6-reframework` | 30 |
| `streetfighter6-looselua` | 29 |
| `streetfighter6-root` | 31 |
| `streetfighter6-preset` | 33 |
| `streetfighter6-fluffymodzip` | 45 |
| `streetfighter6-fluffymodmanager` | 25 |
| `streetfighter6-reframework` | 30 |
| `streetfighter6-looselua` | 29 |
| `streetfighter6-root` | 31 |
| `streetfighter6-preset` | 33 |
| `streetfighter6-fluffymodzip` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config File
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Fluffy Mod Manager | — | — |
| REFramework | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `.` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
