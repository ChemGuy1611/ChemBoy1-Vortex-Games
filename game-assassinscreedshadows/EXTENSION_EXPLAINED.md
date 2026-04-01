# Assassin's Creed Shadows — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | AC Shadows Vortex Extension |
| Engine / Structure | Ubisoft AnvilToolkit & Forger Patch Manager |
| Author | ChemBoy1 |
| Version | 0.1.1 |
| Date | 2025-10-07 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `assassinscreedshadows` |
| Executable | `ACShadows.exe` |

## Supported Stores

- **Steam** — `3159330`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Forger Patch | `assassinscreedshadows-forgerpatch` | high | `{gamePath}/ForgerPatches` |
| Forger Patch Textures | `assassinscreedshadows-forgerpatchtextures` | high | `{gamePath}/ForgerPatches` |
| Root Folder | `assassinscreedshadows-root` | high | `{gamePath}` |
| DLC Folder | `assassinscreedshadows-dlcfolder` | high | `{gamePath}/.` |
| Extracted Folder | `assassinscreedshadows-extractedfolder` | high | `{gamePath}/.` |
| .forge Folder | `assassinscreedshadows-forgefolder` | high | `{gamePath}/.` |
| .data Folder | `assassinscreedshadows-datafolder` | high | `{gamePath}/.` |
| Loose .data File | `assassinscreedshadows-loosedata` | high | `{gamePath}/.` |
| Forge Replacement (root) | `assassinscreedshadows-forgefile` | high | `{gamePath}/.` |
| Forge Replacement (dlc_10) | `assassinscreedshadows-forgefiledlc10` | low | `{gamePath}/dlc_10` |
| Forge Replacement (dlc_26) | `assassinscreedshadows-forgefiledlc26` | low | `{gamePath}/dlc_26` |
| Forge Replacement (dlc_28) | `assassinscreedshadows-forgefiledlc28` | low | `{gamePath}/dlc_28` |
| Forge Replacement (dlc_29) | `assassinscreedshadows-forgefiledlc29` | low | `{gamePath}/dlc_29` |
| Fixes | `assassinscreedshadows-fixes` | low | `{gamePath}/.` |
| AnvilToolkit | `assassinscreedshadows-atk` | low | `{gamePath}` |
| Forger Patch Manager | `assassinscreedshadows-forgerpatchmanager` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `assassinscreedshadows-atk` | 25 |
| `assassinscreedshadows-forgerpatchmanager` | 30 |
| `assassinscreedshadows-dlcfolder` | 40 |
| `assassinscreedshadows-forgefile` | 65 |
| `assassinscreedshadows-root` | 69 |

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| Forger Patch Manager | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
