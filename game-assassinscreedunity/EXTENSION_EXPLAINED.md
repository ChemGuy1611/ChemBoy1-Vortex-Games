# Assassin's Creed Unity — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | AC Unity Vortex Extension |
| Engine / Structure | Ubisoft AnvilToolkit |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `assassinscreedunity` |
| Executable | `ACU.exe` |

## Supported Stores

- **Steam** — `289650`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `assassinscreedunity-binaries` | high | `{gamePath}` |
| DLC Folder | `assassinscreedunity-dlcfolder` | high | `{gamePath}/.` |
| Extracted Folder | `assassinscreedunity-extractedfolder` | high | `{gamePath}/.` |
| .forge Folder | `assassinscreedunity-forgefolder` | high | `{gamePath}/.` |
| .data Folder | `assassinscreedunity-datafolder` | high | `{gamePath}/.` |
| Loose Data Files | `assassinscreedunity-loosedata` | high | `{gamePath}/.` |
| Forge Replacement | `assassinscreedunity-forgefile` | high | `{gamePath}/.` |
| Root Folder | `assassinscreedunity-root` | high | `{gamePath}` |
| ResoRep Textures | `assassinscreedunity-resoreptextures` | high | `{gamePath}/ResoRep/modded` |
| Fixes | `assassinscreedunity-fixes` | low | `{gamePath}/.` |
| ResoRep DLL | `assassinscreedunity-resorep` | low | `{gamePath}/.` |
| AnvilToolkit | `assassinscreedunity-atk` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `assassinscreedunity-atk` | 25 |
| `assassinscreedunity-dlcfolder` | 30 |
| `assassinscreedunity-extractedfolder` | 35 |
| `assassinscreedunity-forgefolder` | 40 |
| `assassinscreedunity-datafolder` | 45 |
| `assassinscreedunity-loosedata` | 50 |
| `assassinscreedunity-fixes` | 55 |
| `assassinscreedunity-resorep` | 57 |
| `assassinscreedunity-forgefile` | 60 |
| `assassinscreedunity-root` | 65 |
| `assassinscreedunity-resoreptextures` | 70 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

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
