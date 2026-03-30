# Sid Meier's Civilization VII — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Civilization VII Vortex Extension |
| Author | ChemBoy1 |
| Version | 0.1.1 |
| Date | 02/12/2025 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `civilizationvii` |
| Executable | `Base/Binaries/Win64/Civ7_Win64_DX12_FinalRelease.exe` |

## Supported Stores

- **Steam** — `1295660`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Mod | `civilizationvii-mod` | high | `MOD_PATH` |
| Root Game Folder | `civilizationvii-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `civilizationvii-mod` | 25 |

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
