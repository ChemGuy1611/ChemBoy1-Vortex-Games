# Alan Wake 2 — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Alan Wake 2 Vortex Extension |
| Engine / Structure | Root Folder Mod Loader |
| Author | ChemBoy1 |
| Version | 1.2.0 |
| Date | 2026-03-22 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `alanwake2` |
| Executable | `AlanWake2.exe` |

## Supported Stores

- **Epic Games Store** — `dc9d2e595d0e4650b35d659f90d41059`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Mod Loader | `alanwake2-modloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `alanwake2-modloader` | 25 |
| `alanwake2-folders` | 27 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **RMDTOC Tool**
- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

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
