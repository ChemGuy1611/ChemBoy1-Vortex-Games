# Resident Evil 4 (2005) — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Resident Evil 4 (2005) Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `residentevil4` |
| Executable | `Bin32/bio4.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Bin32/bio4.exe` |
| Executable (Demo) | `Bin32/bio4.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1869](https://www.nexusmods.com/site/mods/1869) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Resident_Evil_4_Ultimate_HD_Edition](https://www.pcgamingwiki.com/wiki/Resident_Evil_4_Ultimate_HD_Edition) |

## Supported Stores

- **Steam** — `254700`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasLoader` | `false` | true if game needs a mod loader |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `multiExe` | `false` | set to true if there are multiple executable names |
| `multiModPath` | `false` | set to true if there are multiple possible mod paths (i.e. different path for Xbox version) |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `needsModInstaller` | `false` | set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing |
| `rootInstaller` | `true` | enable root installer. Set false if you need to avoid installer collisions |
| `saveInstaller` | `true` | enable save installer. Set false if path is outside of game folder |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `binariesInstaller` | `true` | enables the Binaries folder installer (for engine injectors) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `residentevil4-root` | high | `{gamePath}` |
| Save | `residentevil4-save` | high | `{gamePath}/Bin32/profile/player/saves` |
| Binaries (Engine Injector) | `residentevil4-binaries` | 72 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `residentevil4-binaries` | 27 |
| `residentevil4-root` | 29 |
| `residentevil4-save` | 33 |
| `residentevil4-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Bin32/bio4.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open input.ini
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Mod Loader | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Save | `Bin32/profile/player/saves` |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

