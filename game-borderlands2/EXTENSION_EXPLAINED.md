# Borderlands 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Borderlands 2 Vortex Extension |
| Engine / Structure | UE2/3 Game (TFC Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `borderlands2` |
| Executable | `Binaries/Win32/Borderlands2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `49520`
- **Epic Games Store** — `Dodo`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| OpenBLCMM | `borderlands2-blcmm` | high | `{gamePath}/.` |
| BLCMM Mod | `borderlands2-blcmmmod` | high | `{gamePath}/.` |
| .blcm file (OpenBLCMM) | `borderlands2-blcmfile` | high | `{gamePath}/Binaries` |
| Python SDK | `borderlands2-sdk` | high | `{gamePath}/.` |
| SDK Mod | `borderlands2-sdkmod` | high | `{gamePath}/sdk_mods` |
| TFC Mod | `borderlands2-tfcmod` | high | `{gamePath}/TFCInstaller/Mods` |
| TFC Mod | `borderlands2-tfcmod` | high | `{gamePath}/TFCInstaller/Mods` |
| Root Folder | `borderlands2-root` | high | `{gamePath}` |
| Root Sub Folder | `borderlands2-rootsub` | high | `{gamePath}/WillowGame` |
| Cooked Sub Folder | `borderlands2-cookedsub` | high | `{gamePath}/WillowGame/CookedPCConsole` |
| Binaries (Engine Injector) | `borderlands2-binaries` | high | `{gamePath}/Binaries/Win32` |
| Movies | `borderlands2-movies` | high | `{gamePath}/WillowGame/Movies` |
| TFC Installer | `borderlands2-tfcinstaller` | low | `{gamePath}/.` |
| UPK Explorer | `borderlands2-tfcexplorer` | low | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `borderlands2-tfcinstaller` | 25 |
| `borderlands2-blcmm` | 27 |
| `borderlands2-tfcmod` | 29 |
| `borderlands2-tfcexplorer` | 31 |
| `borderlands2-sdk` | 33 |
| `borderlands2-sdkmod` | 35 |
| `borderlands2-blcmfile` | 37 |
| `borderlands2-root` | 39 |
| `borderlands2-cookedsub` | 41 |
| `borderlands2-movies` | 43 |
| `borderlands2-binaries` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
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
