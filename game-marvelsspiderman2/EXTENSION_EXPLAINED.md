# Marvel's Spider-Man 2 — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Marvel's Spider-Man 2 Vortex Extension |
| Engine / Structure | 3rd-Party Mod Manager (Overstrike) |
| Author | ChemBoy1 |
| Version | 0.2.0 |
| Date | 2026-03-06 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `marvelsspiderman2` |
| Executable | `Spider-Man2.exe` |

## Supported Stores

- **Steam** — `2651280`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries / Root Folder | `marvelsspiderman2-root` | high | `{gamePath}` |
| Overstrike Mod | `marvelsspiderman2-osmod` | high | `{gamePath}/Mods Library` |
| Overstrike | `marvelsspiderman2-overstrike` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `marvelsspiderman2-overstrike` | 25 |
| `marvelsspiderman2-osmod` | 30 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- TOC Reset (After Update)
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `Vortex Steam File Downloader`.

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
