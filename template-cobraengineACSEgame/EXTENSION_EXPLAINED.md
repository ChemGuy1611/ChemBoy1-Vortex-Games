# XXX — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | XXX Vortex Extension |
| Engine / Structure | Cobra Engine (ACSE) |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 2026-XX-XX |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `XXX` |
| Executable | `XXX.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | XXX |
| PCGamingWiki | XXX |

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| ACSE (Script Extender) | `XXX-acse` | high | `{gamePath}/Win64/ovldata` |
| Root Game Folder | `XXX-root` | high | `{gamePath}` |
| ovldata Subfolder | `XXX-ovldata` | high | `{gamePath}/Win64` |
| ACSE Localization | `XXX-localised` | high | `{gamePath}/Win64/ovldata/ACSE` |
| Movies (.webm) | `XXX-movies` | high | `{gamePath}/Movies` |
| Saves | `XXX-save` | high | `SAVE_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `XXX-acse` | 25 |
| `XXX-root` | 27 |
| `XXX-localised` | 29 |
| `XXX-movies` | 31 |
| `XXX-ovldata` | 33 |
| `XXX-save` | 49 |
| `XXX-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Save Folder
- Open Config Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| ACSE (Script Extender) | — | — |

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
