# Devil May Cry 5 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Devil May Cry 5 Vortex Extension |
| Engine / Structure | Fluffy + REFramework (RE Engine) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `devilmaycry5` |
| Executable | `DevilMayCry5.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/434](https://www.nexusmods.com/site/mods/434) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Devil_May_Cry_5](https://www.pcgamingwiki.com/wiki/Devil_May_Cry_5) |

## Supported Stores

- **Steam** — `601150`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `useRefNightly` | `false` | toggle for using the REFramework nightly instead of Nexus release |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `reZip` | `true` | ! NOT WORKING YET - KEEP AS TRUE FOR NOW - set to true to re-zip Fluffy Mods (possibly not necessary for FLUFFY v3.069+) |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `multiExe` | `false` | set to true if there are multiple executables (and multiple FLUFFY_FOLDERs) (typically for Demo) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `devilmaycry5-root` | high | `{gamePath}` |
| Loose Lua/Plugin (REFramework) | `devilmaycry5-looselua` | high | `{gamePath}/.` |
| Fluffy Mod Manager | `devilmaycry5-fluffymanager` | low | `{gamePath}` |
| REFramework | `devilmaycry5-reframework` | low | `{gamePath}` |
| Fluffy Mod | `devilmaycry5-fluffymod` | 25 | `?` |
| Fluffy Preset | `devilmaycry5-preset` | 40 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `devilmaycry5-fluffymanager` | 25 |
| `devilmaycry5-reframework` | 27 |
| `devilmaycry5-looselua` | 29 |
| `devilmaycry5-root` | 31 |
| `devilmaycry5-preset` | 33 |
| `devilmaycry5-fluffymodzip` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`DevilMayCry5.exe`)
- **Custom Launch (Demo)** (`null`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest REFramework Nightly
- Open Config File
- Open Save Folder (Steam)
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Fluffy Mod Manager | — | — |
| REFramework | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `.` |
| Save | `/userdata` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

