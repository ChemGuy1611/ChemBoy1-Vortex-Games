# DOOM I & II (UZDoom) — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Doom I & II (UZDoom) Vortex Extension |
| Engine / Structure | Mod Loader (Any Folder) |
| Author | ChemBoy1 |
| Version | 0.2.1 |
| Date | 2026-03-11 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `gzdoom` |
| Executable | `N/A` |
| PCGamingWiki | XXX |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Mod | `gzdoom-mod` | high | `{gamePath}/DML/FILE/PWAD` |
| IWAD (Game) | `gzdoom-wad` | high | `{gamePath}/DML/FILE/IWAD` |
| UZDoom | `gzdoom-gzdoom` | low | `{gamePath}/DML/FILE/PORT/gzdoom` |
| Doom Mod Loader | `gzdoom-dml` | low | `{gamePath}/DML` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `gzdoom-dml` | 25 |
| `gzdoom-gzdoom` | 27 |
| `gzdoom-wad` | 29 |
| `gzdoom-mod` | 31 |
| `gzdoom-zipmod` | 33 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open DML ReadMe
- Download DML (Manual)
- Open UZDoom Config Folder
- Open Vortex Downloads Folder

## Config & Save Paths

| Type | Path |
|---|---|
| Config | `DML/CONFIG` |

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
