# Tomb Raider (2013) — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Tomb Raider (2013) Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |
| Version | 0.5.0 |
| Date | 2025-10-29 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `tombraider2013` |
| Executable | `TombRaider.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `203160`
- **Epic Games Store** — `d6264d56f5ba434e91d4b0a0b056c83a`
- **GOG** — `1724969043`
- **Xbox / Microsoft Store** — `39C668CD.TombRaiderDefinitiveEdition`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| BINARIES_NAME | `BINARIES_ID` | high | `{gamePath}` |
| MANAGERMOD_NAME | `MANAGERMOD_ID` | high | `{gamePath}/MANAGERMOD_PATH` |
| TEXMODPACK_NAME | `TEXMODPACK_ID` | high | `{gamePath}/TEXMODPACK_PATH` |
| MANAGER_NAME | `MANAGER_ID` | low | `{gamePath}` |
| TEXMOD_NAME | `TEXMOD_ID` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `MANAGER_ID` | 25 |
| `TEXMOD_ID` | 27 |
| `TEXMODPACK_ID` | 29 |
| `MANAGERMOD_ID` | 31 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Logs and Crash Dumps Folder
- View Changelog
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
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
