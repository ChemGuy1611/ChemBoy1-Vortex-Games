# Street Fighter 6 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Street Fighter 6 Vortex Extension |
| Engine / Structure | 3rd Party Mod Manager (Fluffy) |
| Author | ChemBoy1 |

### Notes

- Exe name same in demo version - different Fluffy folder name

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `streetfighter6` |
| Executable | `StreetFighter6.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (Demo) | `StreetFighter6.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/956](https://www.nexusmods.com/site/mods/956) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Street_Fighter_6](https://www.pcgamingwiki.com/wiki/Street_Fighter_6) |

## Supported Stores

- **Steam** — `1364780`

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
| Binaries / Root Folder | `streetfighter6-root` | high | `{gamePath}` |
| Fluffy Mod Manager | `streetfighter6-fluffymodmanager` | low | `{gamePath}` |
| REFramework | `streetfighter6-reframework` | low | `{gamePath}` |
| Fluffy Mod | `streetfighter6-fluffymod` | 25 | `{gamePath}/Games/SF6/Mods` |
| Fluffy Preset | `streetfighter6-preset` | 40 | `{gamePath}/Games/SF6/Presets` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `streetfighter6-fluffymodmanager` | 25 |
| `streetfighter6-reframework` | 30 |
| `streetfighter6-looselua` | 29 |
| `streetfighter6-root` | 31 |
| `streetfighter6-preset` | 33 |
| `streetfighter6-fluffymodzip` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`StreetFighter6.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest REFramework Nightly
- Open Config File
- Open PCGamingWiki Page
- Open Nexus Mods Page
- Open SteamDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder
- Open Save Folder (Steam)

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
