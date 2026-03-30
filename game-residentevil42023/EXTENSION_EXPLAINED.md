# Resident Evil 4 (2023) — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Resident Evil 4 (2023) + Chainsaw Demo Vortex Extension |
| Engine / Structure | 3rd Party Mod Manager (Fluffy) |
| Author | ChemBoy1 |
| Version | 0.4.1 |
| Date | 2026-03-11 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `residentevil42023` |
| Executable | `re4.exe` |
| Executable (Demo) | `re4demo.exe` |

## Supported Stores

- **Steam** — `2050650`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `reZip` | `true` | NOT WORKING YET - KEEP AS TRUE FOR NOW - set to true to re-zip Fluffy Mods (possibly not necessary for FLUFFY v3.069+) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries / Root Folder | `re4-root` | high | `{gamePath}` |
| Loose Lua (REFramework) | `residentevil42023-looselua` | high | `{gamePath}/.` |
| Fluffy Pak Mod | `residentevil42023-fluffypakmod` | high | `{gamePath}/Games/RE4R/Mods` |
| Fluffy Mod Manager | `re4-fluffymodmanager` | low | `{gamePath}` |
| REFramework | `re4-reframework` | low | `{gamePath}` |
| Upscaler | `residentevil42023-upscaler` | low | `{gamePath}/reframework/plugins` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**
- **Steam Demo Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| Fluffy Mod Manager | — | — |
| REFramework | — | — |

## Config & Save Paths

| Type | Path |
|---|---|
| Config | `.` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
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
