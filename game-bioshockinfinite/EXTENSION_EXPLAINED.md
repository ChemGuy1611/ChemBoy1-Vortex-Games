# BioShock Infinite — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | BioShock Infinite Vortex Extension |
| Engine / Structure | UE2/3 Game (TFC Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `bioshockinfinite` |
| Executable | `Binaries/Win32/BioShockInfinite.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/922](https://www.nexusmods.com/site/mods/922) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/BioShock_Infinite](https://www.pcgamingwiki.com/wiki/BioShock_Infinite) |

## Supported Stores

- **Steam** — `8870`
- **Epic Games Store** — `f9d6f0530ea140909f8e8a997a7532d7`
- **GOG** — `1752654506`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| TFC Mod | `bioshockinfinite-tfcmod` | high | `{gamePath}/TFCInstaller/Mods` |
| Movies Mod | `bioshockinfinite-movies` | high | `{gamePath}/XGame/Movies` |
| Root Folder | `bioshockinfinite-root` | high | `{gamePath}` |
| Root Sub Folder | `bioshockinfinite-rootsub` | high | `{gamePath}/XGame` |
| Cooked Sub Folder | `bioshockinfinite-cookedsub` | high | `{gamePath}/XGame/CookedPCConsole_FR` |
| Binaries (Engine Injector) | `bioshockinfinite-binaries` | high | `{gamePath}/Binaries/Win32` |
| TFC Installer | `bioshockinfinite-tfcinstaller` | low | `{gamePath}/.` |
| UPK Explorer | `bioshockinfinite-tfcexplorer` | low | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `bioshockinfinite-tfcinstaller` | 25 |
| `bioshockinfinite-tfcexplorer` | 27 |
| `bioshockinfinite-tfcmod` | 29 |
| `bioshockinfinite-root` | 31 |
| `bioshockinfinite-cookedsub` | 33 |
| `bioshockinfinite-movies` | 35 |
| `bioshockinfinite-binaries` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Binaries/Win32/BioShockInfinite.exe`)

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

