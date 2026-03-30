# Monster Hunter Stories 3: Twisted Reflection — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Monster Hunter Stories 3: Twisted Reflection Vortex Extension |
| Engine / Structure | Fluffy + REFramework (RE Engine) |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 2026-03-17 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `monsterhunterstories3twistedreflection` |
| Executable | `MONSTER_HUNTER_STORIES_3_TWISTED_REFLECTION.exe` |
| Executable (Demo) | `MONSTER_HUNTER_STORIES_3_TWISTED_REFLECTION_TRIAL.exe` |

## Supported Stores

- **Steam** — `2852190`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `reZip` | `true` | NOT WORKING YET - KEEP AS TRUE FOR NOW - set to true to re-zip Fluffy Mods (possibly not necessary for FLUFFY v3.069+) |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `multiExe` | `true` | set to true if there are multiple executables (and multiple FLUFFY_FOLDERs) (typically for Demo) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries / Root Folder | `monsterhunterstories3twistedreflection-root` | high | `{gamePath}` |
| Loose Lua (REFramework) | `monsterhunterstories3twistedreflection-looselua` | high | `{gamePath}/.` |
| Fluffy Mod Manager | `monsterhunterstories3twistedreflection-fluffymanager` | low | `{gamePath}` |
| REFramework | `monsterhunterstories3twistedreflection-reframework` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `monsterhunterstories3twistedreflection-fluffymanager` | 25 |
| `monsterhunterstories3twistedreflection-reframework` | 27 |
| `monsterhunterstories3twistedreflection-looselua` | 29 |
| `monsterhunterstories3twistedreflection-root` | 31 |
| `monsterhunterstories3twistedreflection-preset` | 33 |
| `monsterhunterstories3twistedreflection-fluffymod` | 49 |
| `monsterhunterstories3twistedreflection-fluffymodzip` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**
- **Custom Launch (Demo)**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config File
- Open Save Folder (Steam)
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
