# METAL GEAR SOLID V: THE PHANTOM PAIN — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | METAL GEAR SOLID V: THE PHANTOM PAIN Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `metalgearsolidvtpp` |
| Executable | `./mgsvtpp.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `./mgsvtpp.exe` |
| Executable (Demo) | `./mgsvtpp.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/2196](https://www.nexusmods.com/site/mods/2196) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Metal_Gear_Solid_V%3A_The_Phantom_Pain](https://www.pcgamingwiki.com/wiki/Metal_Gear_Solid_V%3A_The_Phantom_Pain) |

## Supported Stores

- **Steam** — `287700`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasLoader` | `true` | true if game needs a mod loader |
| `allowMgsvFix` | `true` | should MGSVFix be offered to the user (via a notification at setup)? |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `multiExe` | `false` | set to true if there are multiple executable names |
| `multiModPath` | `false` | set to true if there are multiple possible mod paths (i.e. different path for Xbox version) |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `needsModInstaller` | `true` | set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing |
| `rootInstaller` | `true` | enable root installer. Set false if you need to avoid installer collisions |
| `saveInstaller` | `false` | enable save installer. Set false if path is outside of game folder |
| `fallbackInstaller` | `false` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasUserIdFolder` | `true` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `metalgearsolidvtpp-root` | high | `{gamePath}` |
| SnakeBite | `metalgearsolidvtpp-mod` | high | `{gamePath}/SnakeBite_Mods` |
| Snakebite Mod Manager | `metalgearsolidvtpp-loader` | 70 | `?` |
| MGSVFix | `metalgearsolidvtpp-mgsvfix` | 72 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `metalgearsolidvtpp-loader` | 25 |
| `metalgearsolidvtpp-mgsvfix` | 26 |
| `metalgearsolidvtpp-root` | 27 |
| `metalgearsolidvtpp-mod` | 29 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`./mgsvtpp.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest MGSVFix
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Snakebite Mod Manager | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

