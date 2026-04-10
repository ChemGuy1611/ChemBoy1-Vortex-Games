# Dishonored — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Dishonored Vortex Extension |
| Engine / Structure | UE2/3 TFC |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `dishonored` |
| Executable | `Binaries/Win32/Dishonored.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `205100`
- **Epic Games Store** — `d2da64bd4c4e422da4b1a88041492a3a`
- **GOG** — `1701063787`
- **Xbox / Microsoft Store** — `BethesdaSoftworks.DishonoredDE-PC`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| TFC Mod | `dishonored-tfcmod` | high | `{gamePath}/TFCInstaller/Mods` |
| Root Folder | `dishonored-root` | high | `{gamePath}` |
| Root Sub Folder | `dishonored-rootsub` | high | `{gamePath}/DishonoredGame` |
| Cooked Sub Folder | `dishonored-cookedsub` | high | `{gamePath}/DishonoredGame/CookedPCConsole` |
| Movies Mod | `dishonored-movies` | high | `{gamePath}/DishonoredGame/Movies` |
| TFC Installer | `dishonored-tfcinstaller` | low | `{gamePath}/.` |
| UPK Explorer | `dishonored-tfcexplorer` | low | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `dishonored-tfcinstaller` | 25 |
| `dishonored-tfcexplorer` | 27 |
| `dishonored-tfcmod` | 29 |
| `dishonored-root` | 31 |
| `dishonored-cookedsub` | 33 |
| `dishonored-movies` | 35 |
| `dishonored-binaries` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Binaries/Win32/Dishonored.exe`)
- **Custom Launch** (`Binaries/Win64/Dishonored.exe`)

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
