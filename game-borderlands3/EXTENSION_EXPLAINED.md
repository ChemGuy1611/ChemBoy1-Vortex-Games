# Borderlands 3 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Borderlands 3 Vortex Extension |
| Engine / Structure | UE4 Game (Custom) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `borderlands3` |
| Executable | `OakGame/Binaries/Win64/Borderlands3.exe` |

## Supported Stores

- **Steam** — `397540`
- **Epic Games Store** — `Catnip`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Python SDK | `borderlands3-sdk` | high | `{gamePath}/.` |
| SDK Mod | `borderlands3-sdkmod` | high | `{gamePath}/sdk_mods` |
| OpenHotfixLoader | `borderlands3-openhotfixloader` | low | `{gamePath}/OakGame/Binaries/Win64/Plugins` |
| Plugin Loader | `borderlands3-pluginloader` | low | `{gamePath}/OakGame/Binaries/Win64` |
| Hotfix Mod | `borderlands3-hotfix` | high | `{gamePath}/OakGame/Binaries/Win64/Plugins/ohl-mods` |
| Root Folder | `borderlands3-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `borderlands3-binaries` | high | `{gamePath}/OakGame/Binaries/Win64` |
| Movies | `borderlands3-movies` | high | `{gamePath}/OakGame/Content/Movies` |
| Pak Mod | `borderlands3-pak` | high | `{gamePath}/OakGame/Content/Paks` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `borderlands3-openhotfixloader` | 25 |
| `borderlands3-sdk` | 27 |
| `borderlands3-sdkmod` | 28 |
| `borderlands3-pluginloader` | 29 |
| `borderlands3-hotfix` | 31 |
| `borderlands3-root` | 43 |
| `borderlands3-pak` | 45 |
| `borderlands3-movies` | 47 |
| `borderlands3-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

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
