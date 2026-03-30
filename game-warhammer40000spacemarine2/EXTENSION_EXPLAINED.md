# Warhammer 40,000: Space Marine 2 — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | WH40K Space Marine 2 Vortex Extension |
| Engine / Structure | Mods Folder w/ LO |
| Author | ChemBoy1 |
| Version | 0.5.2 |
| Date | 2025-02-08 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `warhammer40000spacemarine2` |
| Executable | `Warhammer 40000 Space Marine 2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `2183900`
- **Epic Games Store** — `bb6054d614284c39bb203ebe134e5d79`
- **Xbox / Microsoft Store** — `FocusHomeInteractiveSA.Magnus`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `loadOrderEnabled` | `true` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| BINARIES_NAME | `BINARIES_ID` | high | `{gamePath}/BINARIES_PATH` |
| Config (LocalAppData) | `warhammer40000spacemarine2-config` | high | `CONFIG_PATH` |
| PAK_NAME | `PAK_ID` | high | `{gamePath}/PAK_PATH` |
| LOCAL_NAME | `LOCAL_ID` | high | `{gamePath}/LOCAL_PATH` |
| LOCALSUB_NAME | `LOCALSUB_ID` | high | `{gamePath}/LOCALSUB_PATH` |
| ROOT_NAME | `ROOT_ID` | high | `{gamePath}` |
| INTEGRATION_STUDIO_NAME | `INTEGRATION_STUDIO_ID` | low | `{gamePath}/INTEGRATION_STUDIO_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `INTEGRATION_STUDIO_ID` | 25 |
| `PAK_ID` | 27 |
| `ROOT_ID` | 29 |
| `LOCAL_ID` | 31 |
| `LOCALSUB_ID` | 33 |
| `BINARIES_ID` | 49 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- === RESTORE SAVES ===
- Download Index V2

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
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
