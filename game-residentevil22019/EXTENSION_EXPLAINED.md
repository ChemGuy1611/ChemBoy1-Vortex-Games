# Resident Evil 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Resident Evil 2 Vortex Extension |
| Engine / Structure | Fluffy + REFramework (RE Engine) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `residentevil22019` |
| Executable | `ClaireJ.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Resident_Evil_2](https://www.pcgamingwiki.com/wiki/Resident_Evil_2) |

## Supported Stores

- **Steam** — `883710`
- **GOG** — `1534123252`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `useRefNightly` | `false` | toggle for using the REFramework nightly instead of Nexus release |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `reZip` | `true` | NOT WORKING YET - KEEP AS TRUE FOR NOW - set to true to re-zip Fluffy Mods (possibly not necessary for FLUFFY v3.069+) |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `multiExe` | `false` | set to true if there are multiple executables (and multiple FLUFFY_FOLDERs) (typically for Demo) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `residentevil22019-root` | high | `{gamePath}` |
| Loose Lua/Plugin (REFramework) | `residentevil22019-looselua` | high | `{gamePath}/.` |
| Fluffy Mod Manager | `residentevil22019-fluffymanager` | low | `{gamePath}` |
| REFramework | `residentevil22019-reframework` | low | `{gamePath}` |
| Fluffy Mod | `residentevil22019-fluffymod` | 25 | `?` |
| Fluffy Preset | `residentevil22019-preset` | 40 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `residentevil22019-fluffymanager` | 25 |
| `residentevil22019-reframework` | 27 |
| `residentevil22019-looselua` | 29 |
| `residentevil22019-root` | 31 |
| `residentevil22019-preset` | 33 |
| `residentevil22019-fluffymod` | 49 |
| `residentevil22019-fluffymodzip` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`ClaireJ.exe`)
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

