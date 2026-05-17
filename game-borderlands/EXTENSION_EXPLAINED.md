# Borderlands — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Borderlands Vortex Extension |
| Engine / Structure | UE2/3 Game (TFC Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `borderlands` |
| Executable | `Binaries/Borderlands.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1450](https://www.nexusmods.com/site/mods/1450) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Borderlands](https://www.pcgamingwiki.com/wiki/Borderlands) |

## Supported Stores

- **Steam** — `8989`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Python SDK | `borderlands-sdk` | high | `{gamePath}/.` |
| SDK Mod | `borderlands-sdkmod` | high | `{gamePath}/sdk_mods` |
| TFC Mod | `borderlands-tfcmod` | high | `{gamePath}/TFCInstaller/Mods` |
| Root Folder | `borderlands-root` | high | `{gamePath}` |
| Root Sub Folder | `borderlands-rootsub` | high | `{gamePath}/WillowGame` |
| Cooked Sub Folder | `borderlands-cookedsub` | high | `{gamePath}/WillowGame/CookedPC` |
| Movies | `borderlands-movies` | high | `{gamePath}/WillowGame/Movies` |
| TFC Installer | `borderlands-tfcinstaller` | low | `{gamePath}/.` |
| UPK Explorer | `borderlands-tfcexplorer` | low | `{gamePath}/.` |
| Binaries (Engine Injector) | `borderlands-binaries` | 50 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `borderlands-tfcinstaller` | 25 |
| `borderlands-tfcexplorer` | 27 |
| `borderlands-tfcmod` | 29 |
| `borderlands-sdk` | 31 |
| `borderlands-sdkmod` | 33 |
| `borderlands-root` | 35 |
| `borderlands-cookedsub` | 37 |
| `borderlands-movies` | 39 |
| `borderlands-binaries` | 41 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Binaries/Borderlands.exe`)
- **Custom Launch** (`Binaries/Binaries/Win64`)

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
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

