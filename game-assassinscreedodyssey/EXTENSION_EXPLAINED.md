# Assassin's Creed Odyssey — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | AC Odyssey Vortex Extension |
| Engine / Structure | Ubisoft AnvilToolkit |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `assassinscreedodyssey` |
| Executable | `ACOdyssey.exe` |

## Supported Stores

- **Steam** — `812140`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Game Folder | `assassinscreedodyssey-binaries` | high | `{gamePath}` |
| Forger Patch | `assassinscreedodyssey-forgerpatch` | high | `{gamePath}/ForgerPatches` |
| Resorep Textures (Documents) | `assassinscreedodyssey-textures` | high | `ddsModPath` |
| Resorep Textures (Game Folder) | `assassinscreedodyssey-texturesgamefolder` | high | `{gamePath}/Resorep` |
| AnvilToolKit | `assassinscreedodyssey-ATK` | low | `{gamePath}` |
| Forger Patch Manager | `assassinscreedodyssey-forger` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `assassinscreedodyssey-forger` | 25 |
| `assassinscreedodyssey-atk` | 25 |

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
