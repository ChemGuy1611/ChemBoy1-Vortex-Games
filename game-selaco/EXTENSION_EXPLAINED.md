# Selaco — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Selaco Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |
| Version | 0.1.1 |
| Date | 2025-10-06 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `selaco` |
| Executable | `SELACO.exe` |

## Supported Stores

- **Steam** — `1592280`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Mod | `selaco-mod` | high | `{gamePath}/Mods` |
| Root Folder | `selaco-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `selaco-mod` | 25 |
| `selaco-root` | 47 |
| `selaco-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.

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
