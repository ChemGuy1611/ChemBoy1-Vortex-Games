# Battlefield 1 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Battlefield 1 Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `battlefield1` |
| Executable | `bf1.exe` |

## Supported Stores

- **Steam** — `1238840`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries (Engine Injector) | `battlefield1-binaries` | high | `{gamePath}` |
| Frosty .fbmod | `battlefield1-frostymod` | high | `{gamePath}/FrostyModManager/Mods/bf1` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `masseffectandromeda-frostymodmanager` | 25 |
| `masseffectandromeda-fbmod` | 30 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game**
- **Frosty Mod Manager**

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
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
