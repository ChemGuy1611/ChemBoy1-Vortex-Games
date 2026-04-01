# Assassin's Creed Origins — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | AC Origins Vortex Extension |
| Engine / Structure | Ubisoft AnvilToolkit |
| Author | ChemBoy1 |
| Version | 0.2.2 |
| Date | 07/31/2024 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `assassinscreedorigins` |
| Executable | `ACOrigins.exe` |

## Supported Stores

- **Steam** — `582160`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries / Root Game Folder | `assassinscreedorigins-binaries` | high | `{gamePath}` |
| Forger Patch | `assassinscreedorigins-forgerpatch` | high | `{gamePath}/ForgerPatches` |
| Resorep Textures (Documents) | `assassinscreedorigins-textures` | high | `ddsModPath` |
| Resorep Textures (Game Folder) | `assassinscreedorigins-texturesgamefolder` | high | `{gamePath}/Resorep` |
| AnvilToolKit | `assassinscreedorigins-ATK` | low | `{gamePath}` |
| Forger Patch Manager | `assassinscreedorigins-forger` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `assassinscreedorigins-forger` | 25 |
| `assassinscreedorigins-atk` | 25 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **AnvilToolkit**
- **Forger Patch Manager**

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
