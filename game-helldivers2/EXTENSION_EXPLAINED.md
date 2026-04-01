# Helldivers 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Helldivers 2 Vortex Extension |
| Engine / Structure | Custom Game Data |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `helldivers2` |
| Executable | `bin/helldivers2.exe` |

## Supported Stores

- **Steam** — `553850`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasVariants` | `false` |  |
| `hasVariants` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Game Data (.dl_bin) | `helldivers2-data` | high | `{gamePath}/data/game` |
| Data Stream File (.stream) | `helldivers2-stream` | high | `{gamePath}/data` |
| Binaries (Engine Injector) | `helldivers2-binaries` | high | `{gamePath}/bin` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `helldivers2-data` | 25 |
| `helldivers2-patch--MergedMods--This-is-fine--Ignore-this--SELECT-APPLY-CHANGES--DO-NOT-ENABLE` | 27 |
| `helldivers2-soundpatch` | 27 |
| `helldivers2-stream` | 31 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
