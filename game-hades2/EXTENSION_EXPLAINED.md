# Hades II — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Hades II Vortex Extension |
| Engine / Structure | 3rd-Party Mod Installer |
| Author | ChemBoy1 |
| Version | 0.1.3 |
| Date | 2025-09-26 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `hades2` |
| Executable | `Ship/Hades2.exe` |

## Supported Stores

- **Steam** — `1145350`
- **Epic Games Store** — `07c634c7291a49b5b2455e14b9a83950`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Mod | `hades2-mod` | high | `{gamePath}/Content/Mods` |
| Binaries | `hades2-binaries` | high | `{gamePath}/Ship` |
| Root Game Folder | `hades2-root` | high | `{gamePath}` |
| Mod Importer | `hades2-manager` | low | `{gamePath}/Content` |
| Mod Utility | `hades2-modutility` | low | `{gamePath}/Content/Mods/ModUtil` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `hades2-manager` | 25 |
| `hades2-modutility` | 27 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Mod Importer**
- **Vulkan Launch**

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

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
