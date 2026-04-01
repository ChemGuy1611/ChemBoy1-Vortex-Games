# DOOM (2016) — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | DOOM (2016) Vortex Extension |
| Engine / Structure | 3rd party mod loader |
| Author | ChemBoy1 |
| Version | 0.5.1 |
| Date | 2025-05-28 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `doom` |
| Executable | `DOOMx64vk.exe` |

## Supported Stores

- **Steam** — `379720`
- **GOG** — `1390579243`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries / Root Folder | `doom-binaries` | high | `{gamePath}` |
| Loader Mods | `doom-mods` | high | `{gamePath}/Mods` |
| DOOM Legacy Mod | `doom-legacy` | high | `{gamePath}` |
| Version Rollback Files | `doom-rollback` | low | `{gamePath}` |
| DOOMModLoader | `doom-modloader` | low | `{gamePath}` |
| DOOMLauncher | `doom-launcher` | low | `{gamePath}` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded DOOM**
- **DOOMLauncher**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| DOOMModLoader | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).

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
