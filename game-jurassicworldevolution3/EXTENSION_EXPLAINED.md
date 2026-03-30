# Jurassic World Evolution 3 — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Jurassic World Evolution 3 Vortex Extension |
| Engine / Structure | Cobra Engine (ACSE) |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 2025-10-22 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `jurassicworldevolution3` |
| Executable | `JWE3.exe` |

## Supported Stores

- **Steam** — `2958130`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| ACSE | `jurassicworldevolution3-acse` | high | `{gamePath}/Win64/ovldata` |
| Root Game Folder | `jurassicworldevolution3-root` | high | `{gamePath}` |
| ovldata Subfolder | `jurassicworldevolution3-ovldata` | high | `{gamePath}/Win64` |
| ACSE Localization | `jurassicworldevolution3-localised` | high | `{gamePath}/Win64/ovldata/ACSE` |
| Movies (.webm) | `jurassicworldevolution3-movies` | high | `{gamePath}/Movies` |
| Saves | `jurassicworldevolution3-save` | high | `SAVE_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `jurassicworldevolution3-acse` | 25 |
| `jurassicworldevolution3-root` | 27 |
| `jurassicworldevolution3-localised` | 29 |
| `jurassicworldevolution3-movies` | 31 |
| `jurassicworldevolution3-ovldata` | 33 |
| `jurassicworldevolution3-save` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Save Folder
- Open Config Folder
- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| ACSE | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

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
