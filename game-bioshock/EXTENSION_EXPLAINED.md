# BioShock — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | BioShock Remastered Vortex Extension |
| Engine / Structure | UE2/3 TFC |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `bioshock` |
| Executable | `BioshockHD.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/920](https://www.nexusmods.com/site/mods/920) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/BioShock](https://www.pcgamingwiki.com/wiki/BioShock) |

## Supported Stores

- **Steam** — `409710`
- **Epic Games Store** — `bc2c95c6ff564a16b26644f1d3ac3c55`
- **GOG** — `1439656515`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| TFC Mod | `bioshock-tfcmod` | high | `{gamePath}/TFCInstaller/Mods` |
| Movies Mod | `bioshock-movies` | high | `{gamePath}/ContentBaked/pc/BinkMovies` |
| Root Folder | `bioshock-root` | high | `{gamePath}` |
| Root Sub Folder | `bioshock-rootsub` | high | `{gamePath}/ContentBaked/pc` |
| Cooked Sub Folder | `bioshock-cookedsub` | high | `{gamePath}/ContentBaked/pc/BulkContent` |
| TFC Installer | `bioshock-tfcinstaller` | low | `{gamePath}/.` |
| UPK Explorer | `bioshock-tfcexplorer` | low | `{gamePath}/.` |
| Binaries (Engine Injector) | `bioshock-binaries` | 40 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `bioshock-tfcinstaller` | 25 |
| `bioshock-tfcexplorer` | 27 |
| `bioshock-tfcmod` | 29 |
| `bioshock-root` | 31 |
| `bioshock-cookedsub` | 33 |
| `bioshock-movies` | 35 |
| `bioshock-binaries` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Build/Final/BioshockHD.exe`)
- **Custom Launch** (`Build/FinalEpic/BioshockHD.exe`)
- **Custom Launch** (`Builds/Release/Bioshock.exe`)

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

