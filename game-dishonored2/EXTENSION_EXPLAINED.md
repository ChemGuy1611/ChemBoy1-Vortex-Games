# Dishonored 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Dishonored 2 Vortex Extension |
| Engine / Structure | Void Installer |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `dishonored2` |
| Executable | `Dishonored2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `403640`
- **Epic Games Store** — `f5df10ade404453abaaed9c6c204e3d5`
- **GOG** — `1431426311`
- **Xbox / Microsoft Store** — `BethesdaSoftworks.Dishonored2-PC`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| VOIDMOD_NAME | `VOIDMOD_ID` | high | `{gamePath}/VOIDMOD_PATH` |
| VOID_NAME | `VOID_ID` | low | `{gamePath}/VOID_PATH` |
| Root Game Folder | `dishonored2-root` | high | `{gamePath}` |
| VIDEO_NAME | `VIDEO_ID` | high | `{gamePath}/VIDEO_PATH` |
| VOIDEXPLORER_NAME | `VOIDEXPLORER_ID` | low | `{gamePath}/VOIDEXPLORER_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `CONFIG_ID` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Dishonored2.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
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
