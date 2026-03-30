# The Last of Us Part II\t Remastered — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | The Last of Us Part II Remastered Vortex Extension |
| Engine / Structure | Generic Game w/ File Extraction, Mod Loader, and Load Order |
| Author | ChemBoy1 |
| Version | 0.7.0 |
| Date | 2026-02-11 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `thelastofuspart2` |
| Executable | `launcher.exe` |

## Supported Stores

- **Steam** — `2531310`
- **Epic Games Store** — `831cd8c0c25b4615ade419ecb4f50e42`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `LOAD_ORDER_ENABLED` | `true` |  |
| `mod_update_all_profile` | `false` |  |
| `updating_mod` | `false` | used to see if it's a mod update or not |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| .psarc (Mod Loader) | `thelastofuspart2-psarc` | high | `{gamePath}/mods` |
| Build Folder | `thelastofuspart2-buildfolder` | high | `{gamePath}/.` |
| bin Folder | `thelastofuspart2-binfolder` | high | `{gamePath}/build/pc/main` |
| Pak (actor97) | `thelastofuspart2-pak` | high | `{gamePath}/build/pc/main` |
| Save | `thelastofuspart2-save` | high | `SAVE_PATH` |
| CONFIG_NAME | `CONFIG_ID` | high | `CONFIG_PATH` |
| PSARCTOOL_NAME | `PSARCTOOL_ID` | low | `{gamePath}/build/pc/main` |
| ND Mod Loader | `thelastofuspart2-modloader` | low | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `thelastofuspart2-modloader` | 25 |
| `thelastofuspart2-psarc` | 27 |
| `thelastofuspart2-buildfolderpakbin` | 29 |
| `thelastofuspart2-binfolder` | 31 |
| `thelastofuspart2-pak` | 33 |
| `thelastofuspart2-buildfolder` | 35 |
| `thelastofuspart2-save` | 37 |
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
- Open .psarc 
- Open modloader.ini
- Open chunks.txt
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
