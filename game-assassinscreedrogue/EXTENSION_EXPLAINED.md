# Assassin's Creed Rogue — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | AC Rogue Vortex Extension |
| Engine / Structure | Ubisoft AnvilToolkit |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 07/29/2024 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `assassinscreedrogue` |
| Executable | `ACC.exe` |

## Supported Stores

- **Steam** — `311560`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries / Root Game Folder | `assassinscreediii-binaries` | high | `{gamePath}` |
| AnvilToolKit | `assassinscreedrogue-atk` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `assassinscreedrogue-atk` | 25 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **AnvilToolkit**

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
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
