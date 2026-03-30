# Resident Evil Requiem — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Resident Evil Requiem Vortex Extension |
| Engine / Structure | Fluffy + REFramework (RE Engine) |
| Author | ChemBoy1 |
| Version | 0.1.3 |
| Date | 2026-03-05 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `residentevilrequiem` |
| Executable | `re9.exe` |
| Executable (Demo) | `re9demo.exe` |

## Supported Stores

- **Steam** — `3764200`
- **Epic Games Store** — `d9b9a31471634f69916e07cd5e5d2fc3`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `reZip` | `true` | NOT WORKING YET - KEEP AS TRUE FOR NOW - set to true to re-zip Fluffy Mods (possibly not necessary for FLUFFY v3.069+) |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `multiExe` | `false` | set to true if there are multiple executables (and multiple FLUFFY_FOLDERs) (typically for Demo) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries / Root Folder | `residentevilrequiem-root` | high | `{gamePath}` |
| Loose Lua (REFramework) | `residentevilrequiem-looselua` | high | `{gamePath}/.` |
| Fluffy Mod Manager | `residentevilrequiem-fluffymanager` | low | `{gamePath}` |
| REFramework | `residentevilrequiem-reframework` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `residentevilrequiem-fluffymanager` | 25 |
| `residentevilrequiem-reframework` | 27 |
| `residentevilrequiem-looselua` | 29 |
| `residentevilrequiem-root` | 31 |
| `residentevilrequiem-preset` | 33 |
| `residentevilrequiem-fluffymod` | 45 |
| `residentevilrequiem-fluffymodzip` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`re9.exe`)
- **Custom Launch** (`re9demo.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest REFramework Nightly
- Download EMV Engine (Modding Tools)
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
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
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
