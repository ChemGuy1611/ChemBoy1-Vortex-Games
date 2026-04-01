# Bloodborne — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Bloodborne Vortex Extension |
| Engine / Structure | Emulation Game |
| Author | ChemBoy1 |
| Version | 0.3.0 |
| Date | 2026-02-16 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `bloodborne` |
| Executable | `N/A` |
| PCGamingWiki | XXX |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Game Data (dvdroot_ps4) | `bloodborne-dvdroot_ps4` | high | `{gamePath}/CUSA03173/dvdroot_ps4` |
| Save | `bloodborne-save` | high | `{gamePath}/user/savedata/1/CUSA03173/SPRJ0005` |
| Root Folder | `bloodborne-root` | high | `{gamePath}` |
| shadPS4 | `bloodborne-shadps4` | low | `{gamePath}` |
| shadPS4QtLauncher | `bloodborne-shadps4qtlauncher` | low | `{gamePath}` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **shadPS4 (No-GUI)**
- **shadPS4QtLauncher**
- **Smithbox**
- **Flver Editor**

## Config & Save Paths

| Type | Path |
|---|---|
| Save | `user/savedata/1/CUSA03173/SPRJ0005` |

## Special Features

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
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
