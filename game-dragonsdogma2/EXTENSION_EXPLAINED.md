# Dragon's Dogma 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Dragon's Dogma 2 Vortex Extension |
| Engine / Structure | Fluffy + REFramework (RE Engine) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `dragonsdogma2` |
| Executable | `DD2.exe` |

## Supported Stores

- **Steam** — `2054970`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `dragonsdogma2-root` | high | `{gamePath}` |
| Loose Lua (REFramework) | `dragonsdogma2-looselua` | high | `{gamePath}/.` |
| Fluffy Preset | `dragonsdogma2-preset` | high | `{gamePath}/Games/DragonsDogma2/Presets` |
| Fluffy Mod Manager | `dragonsdogma2-fluffymodmanager` | low | `{gamePath}` |
| Fluffy Mod | `dragonsdogma2-fluffymod` | high | `{gamePath}/Games/DragonsDogma2/Mods` |
| Fluffy Pak Mod | `dragonsdogma2-fluffypakmod` | high | `{gamePath}/Games/DragonsDogma2/Mods` |
| REFramework | `dragonsdogma2-reframework` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `dragonsdogma2-fluffymodmanager` | 25 |
| `dragonsdogma2-reframework` | 30 |
| `dragonsdogma2-looselua` | 41 |
| `dragonsdogma2-preset` | 43 |
| `dragonsdogma2-fluffymodzip` | 45 |

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
| REFramework | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
