# NINJA GAIDEN: Master Collection — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | NINJA GAIDEN: Master Collection Vortex Extension |
| Engine / Structure | Multi-Game, Mod Loader |
| Author | ChemBoy1 |
| Version | 0.2.0 |
| Date | 2025-11-10 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `ninjagaidenmastercollection` |
| Executable | `N/A` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| ROOT_NAME | `ROOT_ID` | high | `{gamePath}` |
| MLMOD_NAME | `MLMOD_ID` | high | `{gamePath}/MLMOD_PATH` |
| DATABIN_NAME | `DATABIN_ID` | high | `{gamePath}` |
| DATABINSUB_NAME | `ninjagaidenmastercollection-databinsubfolder1` | high | `{gamePath}/DATABINSUB_PATH` |
| MODLOADER_XBOX_NAME | `MODLOADER_XBOX_ID` | low | `{gamePath}` |
| Essential Files for NGS1 | `ninjagaidensigma-steammodloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `MODLOADER_XBOX_ID` | 25 |
| `ninjagaidensigma-steammodloader` | 27 |
| `MODLOADER_STEAM_ID2` | 29 |
| `ninjagaiden3razorsedge-steammodloader` | 31 |
| `MLMOD_ID` | 33 |
| `DATABIN_ID` | 35 |
| `ninjagaidenmastercollection-databinsubfolder1` | 37 |
| `DATABINSUB_ID23` | 40 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config/Save Folder
- View Changelog
- Open Downloads Folder
- Open Config/Save Folder
- View Changelog
- Open Downloads Folder
- Open Config/Save Folder
- View Changelog
- Open Downloads Folder

## Special Features

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
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
