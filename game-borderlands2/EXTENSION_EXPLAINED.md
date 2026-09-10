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
| Extension Page | [https://www.nexusmods.com/site/mods/1448](https://www.nexusmods.com/site/mods/1448) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Borderlands_2](https://www.pcgamingwiki.com/wiki/Borderlands_2) |

## Supported Stores

- **Steam** — `49520`
- **Epic Games Store** — `Dodo`

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

- **Custom Launch** (`Binaries/Win32/Borderlands2.exe`)

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

