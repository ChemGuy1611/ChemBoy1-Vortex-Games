# Wolfenstein (2009) — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Wolfenstein (2009) Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |
| Version | 0.2.2 |
| Date | 08/07/2024 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `wolfenstein2009` |
| Executable | `SP/Wolf2.exe` |

## Supported Stores

- **Steam** — `10170`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| SinglePlayer base Folder | `wolfenstein2009-spbase` | high | `{gamePath}/SP/base` |
| MultiPlayer base Folder | `wolfenstein2009-mpbase` | high | `{gamePath}/MP/base` |
| SP Folder | `wolfenstein2009-sp` | high | `{gamePath}/SP` |
| MP Folder | `wolfenstein2009-mp` | high | `{gamePath}/MP` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `wolfenstein2009-base` | 25 |
| `wolfenstein2009-maps` | 30 |
| `wolfenstein2009-streampacks` | 35 |
| `wolfenstein2009-videos` | 40 |
| `wolfenstein2009-pk4` | 45 |
| `wolfenstein2009-exe` | 50 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch SP Game**
- **Launch MP Game**

## Special Features

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
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
