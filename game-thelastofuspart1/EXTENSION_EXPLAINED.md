# The Last of Us Part I — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | The Last of Us Part I Vortex Extension |
| Engine / Structure | Gemeric Game w/ File Extraction |
| Author | ChemBoy1 |
| Version | 2.1.0 |
| Date | 2026-02-11 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `thelastofuspart1` |
| Executable | `launcher.exe` |

## Supported Stores

- **Steam** — `1888930`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Build Folder | `thelastofuspart1-buildfolder` | high | `{gamePath}/.` |
| bin Folder | `thelastofuspart1-binfolder` | high | `{gamePath}/build/pc/main` |
| Pak (actor97) | `thelastofuspart1-pak` | high | `{gamePath}/build/pc/main` |
| Save | `thelastofuspart1-save` | high | `SAVE_PATH` |
| CONFIG_NAME | `CONFIG_ID` | high | `CONFIG_PATH` |
| PSARCTOOL_NAME | `PSARCTOOL_ID` | low | `{gamePath}/PSARCTOOL_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `thelastofuspart1-buildfolderpakbin` | 29 |
| `thelastofuspart1-binfolder` | 31 |
| `thelastofuspart1-pak` | 33 |
| `thelastofuspart1-buildfolder` | 35 |
| `thelastofuspart1-save` | 37 |
| `CONFIG_ID` | 39 |
| `PSARCTOOL_ID` | 41 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Extract .psarc Files
- Cleanup Extracted .psarc Files
- Open 
- Open Saves Folder
- Open Config Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
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
