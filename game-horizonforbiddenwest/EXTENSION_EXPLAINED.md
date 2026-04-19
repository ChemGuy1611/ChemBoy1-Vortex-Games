# Horizon Forbidden West — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Horizon Forbidden West Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `horizonforbiddenwest` |
| Executable | `HorizonForbiddenWest.exe` |

## Supported Stores

- **Steam** — `2420110`
- **Epic Games Store** — `2efe99166b8847e9bcd80c571b05e1b6`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| MANAGERMOD_NAME | `MANAGERMOD_ID` | high | `{gamePath}/MANAGERMOD_PATH` |
| MODMANAGER_NAME | `MODMANAGER_ID` | low | `{gamePath}` |
| REPACKER_NAME | `REPACKER_ID` | low | `{gamePath}` |
| Save Game (Documents) | `horizonforbiddenwest-save` | low | `SAVE_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `REPACKER_ID` | 25 |
| `MANAGERMOD_ID` | 27 |
| `horizonforbiddenwest-save` | 25 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download HFW Mod Manager (Update)
- Open HFW Mod Manager Page
- Open Saves Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
