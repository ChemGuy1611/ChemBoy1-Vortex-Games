# Assassin's Creed IV Black Flag — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | AC IV Black Flag Vortex Extension |
| Engine / Structure | Ubisoft AnvilToolkit |
| Author | ChemBoy1 |
| Version | 0.4.3 |
| Date | 03/18/2025 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `assassinscreedivblackflag` |
| Executable | `AC4BFSP.exe` |

## Supported Stores

- **Steam** — `242050`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries / Root Folder | `assassinscreedivblackflag-binaries` | high | `{gamePath}` |
| DLC Folder | `assassinscreedivblackflag-dlcfolder` | high | `{gamePath}/.` |
| Extracted Folder | `assassinscreedivblackflag-extractedfolder` | high | `{gamePath}/.` |
| .forge Folder | `assassinscreedivblackflag-forgefolder` | high | `{gamePath}/.` |
| .data Folder | `assassinscreedivblackflag-datafolder` | high | `{gamePath}/.` |
| Loose Data Files | `assassinscreedivblackflag-loosedata` | high | `{gamePath}/.` |
| Forge Replacement | `assassinscreedivblackflag-forgefile` | high | `{gamePath}/.` |
| Root Folder | `assassinscreedivblackflag-root` | high | `{gamePath}` |
| ResoRep Textures | `assassinscreedivblackflag-resoreptextures` | high | `{gamePath}/ResoRep/modded` |
| Fixes | `assassinscreedivblackflag-fixes` | low | `{gamePath}/.` |
| ResoRep DLL | `assassinscreedivblackflag-resorep` | low | `{gamePath}/.` |
| AnvilToolkit | `assassinscreedivblackflag-atk` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `assassinscreedivblackflag-atk` | 25 |
| `assassinscreedivblackflag-dlcfolder` | 30 |
| `assassinscreedivblackflag-extractedfolder` | 35 |
| `assassinscreedivblackflag-forgefolder` | 40 |
| `assassinscreedivblackflag-datafolder` | 45 |
| `assassinscreedivblackflag-loosedata` | 50 |
| `assassinscreedivblackflag-resorep` | 57 |
| `assassinscreedivblackflag-forgefile` | 60 |
| `assassinscreedivblackflag-root` | 65 |
| `assassinscreedivblackflag-resoreptextures` | 70 |

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
