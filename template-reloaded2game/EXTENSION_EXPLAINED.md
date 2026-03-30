# XXX — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | XXX Vortex Extension |
| Engine / Structure | Reloaded-II Game (Mod Installer) |
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
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Reloaded Mod | `XXX-reloadedmod` | high | `{gamePath}/Reloaded/Mods` |
| Mod Loader | `XXX-reloadedmodloader` | low | `{gamePath}/Reloaded/Mods/XXX_Mod_Loader` |
| Reloaded-II Mod Manager | `XXX-reloadedmanager` | low | `{gamePath}` |
| Save File | `XXX-save` | high | `{gamePath}/SAVE_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `XXX-reloadedmanager` | 25 |
| `XXX-reloadedmodloader` | 27 |
| `XXX-reloadedmod` | 29 |
| `XXX-fallback` | 49 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Reloaded Mod Manager
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| Reloaded-II | — | — |

## Config & Save Paths

| Type | Path |
|---|---|
| Save | `gamedata/savedata` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
