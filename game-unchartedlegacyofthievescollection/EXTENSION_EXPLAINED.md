# Uncharted: Legacy of Thieves Collection — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Uncharted: Legacy of Thieves Collection Vortex Extension |
| Engine / Structure | 3rd Party Mod Manager (Fluffy) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `unchartedlegacyofthievescollection` |
| Executable | `u4-l.exe` |

## Supported Stores

- **Steam** — `1659420`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Game Root Folder | `unchartedlegacyofthievescollection-root` | high | `{gamePath}` |
| PSARC Files | `unchartedlegacyofthievescollection-psarc` | high | `{gamePath}` |
| Fluffy Mod Manager | `unchartedlegacyofthievescollection-fluffymodmanager` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `unchartedlegacyofthievescollection-fluffymodmanager` | 25 |
| `unchartedlegacyofthievescollection-psarc` | 30 |
| `unchartedlegacyofthievescollection-mods` | 40 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Uncharted 4**
- **Launch Uncharted TLL**
- **Fluffy Mod Manager**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Fluffy Mod Manager | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.

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
