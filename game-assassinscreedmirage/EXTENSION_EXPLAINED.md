# Assassin's Creed Mirage — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | AC Mirage Vortex Extension |
| Author | ChemBoy1 |
| Version | 0.3.0 |
| Date | 10/14/2024 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `assassinscreedmirage` |
| Executable | `ACMirage.exe` |

## Supported Stores

- **Steam** — `3035570`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Forger Patch | `assassinscreedmirage-forgerpatch` | high | `{gamePath}/ForgerPatches` |
| AnvilToolKit | `assassinscreedmirage-atk` | low | `{gamePath}` |
| Forger Patch Manager | `assassinscreedmirage-forger` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `assassinscreedmirage-atk` | 25 |
| `assassinscreedmirage-forger` | 35 |

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
