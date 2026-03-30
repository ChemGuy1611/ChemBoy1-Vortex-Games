# Far Cry XXX — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Far Cry XXX Vortex Extension |
| Engine / Structure | Far Cry Game (Mod Installer) |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 2026-XX-XX |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `farcryXXX` |
| Executable | `bin/XXX.exe` |
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
| Root Folder | `farcryXXX-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `farcryXXX-binaries` | high | `{gamePath}/bin` |
| Game Data | `farcryXXX-data` | high | `{gamePath}/data_win32` |
| FC Mod Installer | `farcryXXX-modinstaller` | high | `{gamePath}/FCModInstaller` |
| FCMI Mod (.a2/.a3/.a4/.a5/.bin) | `farcryXXX-mimod` | high | `{gamePath}/FCModInstaller/ModifiedFilesFCXXX` |
| Repacked FCMI Mod | `farcryXXX-mimoda3` | high | `{gamePath}/FCModInstaller/ModifiedFilesFCXXX` |
| XML Settings Mod | `farcryXXX-xml` | high | `XML_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `farcryXXX-modinstaller` | 25 |
| `farcryXXX-root` | 27 |
| `farcryXXX-data` | 29 |
| `farcryXXX-binaries` | 31 |
| `farcryXXX-mimoda3` | 33 |
| `farcryXXX-mimod` | 35 |
| `farcryXXX-xml` | 37 |
| `farcryXXX-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Far Cry Mods Site
- Open Far Cry Mod Installer Site
- Open Config Folder
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| FC Mod Installer | — | — |

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
