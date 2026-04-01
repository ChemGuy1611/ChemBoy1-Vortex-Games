# Far Cry 3 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Far Cry 3 Vortex Extension |
| Engine / Structure | Basic Game (Mod Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `farcry3` |
| Executable | `bin/farcry3_d3d11.exe` |

## Supported Stores

- **Steam** — `220240`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `farcry3-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `farcry3-binaries` | high | `{gamePath}/bin` |
| Game Data | `farcry3-data` | high | `{gamePath}/data_win32` |
| FC3 Mod Installer | `farcry3-modinstaller` | high | `{gamePath}/FCModInstaller` |
| Large Address Aware App | `farcry3-largeaddressaware` | high | `{gamePath}` |
| FCMI Mod (.a2/.a3/.a4/.a5/.bin) | `farcry3-mimod` | high | `{gamePath}/FCModInstaller/ModifiedFilesFC3` |
| Repacked FCMI Mod | `farcry3-mimoda3` | high | `{gamePath}/FCModInstaller/ModifiedFilesFC3` |
| XML Settings Mod | `farcry3-xml` | high | `XML_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `farcry3-modinstaller` | 25 |
| `farcry3-ziggy` | 26 |
| `farcry3-root` | 27 |
| `farcry3-data` | 29 |
| `farcry3-binaries` | 31 |
| `farcry3-xml` | 33 |
| `farcry3-mimoda3` | 35 |
| `farcry3-mimod` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Large Address Aware**
- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Far Cry Mods Site
- Open Far Cry Mod Installer Site
- Open Config Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| FC3 Mod Installer | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

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
