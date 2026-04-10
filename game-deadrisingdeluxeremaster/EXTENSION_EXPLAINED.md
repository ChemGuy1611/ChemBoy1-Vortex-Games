# Dead Rising Deluxe Remaster — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Dead Rising Deluxe Remaster Vortex Extension |
| Engine / Structure | 3rd Party Mod Manager (Fluffy) |
| Author | ChemBoy1 |

### Notes

- Demo version has same exe name and same Fluffy folder name

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `deadrisingdeluxeremaster` |
| Executable | `DRDR.exe` |
| Executable (Demo) | `DRDR.exe` |

## Supported Stores

- **Steam** — `2527390`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `deadrisingdeluxeremaster-root` | high | `{gamePath}` |
| Fluffy Mod | `deadrisingdeluxeremaster-fluffymod` | high | `{gamePath}/Games/DeadRisingRemaster/Mods` |
| Fluffy Preset | `deadrisingdeluxeremaster-preset` | high | `{gamePath}/Games/DeadRisingRemaster/Presets` |
| Fluffy Mod Manager | `deadrisingdeluxeremaster-fluffymodmanager` | low | `{gamePath}` |
| REFramework | `deadrisingdeluxeremaster-reframework` | low | `{gamePath}` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Fluffy Mod Manager | — | — |
| REFramework | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
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
