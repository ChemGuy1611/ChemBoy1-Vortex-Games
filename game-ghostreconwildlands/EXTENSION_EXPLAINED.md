# Tom Clancy's Ghost Recon Wildlands — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Tom Clancy's Ghost Recon Wildlands Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `ghostreconwildlands` |
| Executable | `./GRW.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/2170](https://www.nexusmods.com/site/mods/2170) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Tom_Clancy%27s_Ghost_Recon_Wildlands](https://www.pcgamingwiki.com/wiki/Tom_Clancy%27s_Ghost_Recon_Wildlands) |

## Supported Stores

- **Steam** — `460930`
- **Epic Games Store** — `Hyacinth`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasLoader` | `false` | true if game needs a mod loader |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `needsModInstaller` | `true` | set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing |
| `rootInstaller` | `true` | enable root installer. Set false if you need to avoid installer collisions |
| `saveInstaller` | `false` | enable save installer. Set false if path is outside of game folder |
| `fallbackInstaller` | `false` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `ghostreconwildlands-root` | high | `{gamePath}` |
| Mod | `ghostreconwildlands-mod` | high | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ghostreconwildlands-root` | 27 |
| `ghostreconwildlands-mod` | 29 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`./GRW.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config File
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Mod Loader | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

