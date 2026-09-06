# Lobotomy Corporation — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Lobotomy Corporation Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

### Notes

- The BaseMod loader is the Lobotomy Mod Manager (LMM) release archive, downloaded from GitHub.
- Mods install to LobotomyCorp_Data/BaseMods/<Archive Name>/ and are enabled and ordered through

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `lobotomycorporation` |
| Executable | `./LobotomyCorp.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `./LobotomyCorp.exe` |
| Executable (Demo) | `./LobotomyCorp.exe` |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Lobotomy_Corporation](https://www.pcgamingwiki.com/wiki/Lobotomy_Corporation) |

## Supported Stores

- **Steam** — `568220`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasLoader` | `true` | true if game needs a mod loader |
| `LOAD_ORDER_ENABLED` | `true` | enable the load order page backed by BaseModList_v2.xml |
| `nexusCreditDownload` | `true` | true to also download the mod loader's official Nexus release, so its mod page gets the download credit |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `multiExe` | `false` | set to true if there are multiple executable names |
| `multiModPath` | `false` | set to true if there are multiple possible mod paths (i.e. different path for Xbox version) |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `needsModInstaller` | `true` | set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing |
| `rootInstaller` | `true` | enable root installer. Set false if you need to avoid installer collisions |
| `saveInstaller` | `false` | enable save installer. Set false if path is outside of game folder |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `binariesInstaller` | `false` | enables the Binaries folder installer (for engine injectors) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `lobotomycorporation-root` | high | `{gamePath}` |
| BaseMod | `lobotomycorporation-mod` | high | `{gamePath}/LobotomyCorp_Data/BaseMods` |
| BaseMod Loader | `lobotomycorporation-loader` | 70 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `lobotomycorporation-loader` | 25 |
| `lobotomycorporation-root` | 27 |
| `lobotomycorporation-mod` | 29 |
| `lobotomycorporation-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`./LobotomyCorp.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open BaseModList_v2.xml File
- Open Mods Folder
- Open Config Folder
- Open Save Folder
- Open BaseMod Loader Nexus Page
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BaseMod Loader | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

