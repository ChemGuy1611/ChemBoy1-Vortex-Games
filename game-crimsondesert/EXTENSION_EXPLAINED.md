# Crimson Desert — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Crimson Desert Vortex Extension |
| Engine / Structure | Basic Game w/ 3rd Party Manager Integration |
| Author | ChemBoy1 |

### Notes

- Supports plugin mods and data mods with "00XX" folders (XX <= 35)
- Supports Crimson Browser (manifest.json and files folder) and JSON Mod Manager (.json or "0036+" folder) mods
- FUTURE: May be able to update to use Vortex LO ("0036"+ folders and patch metadata on deploy)
- Would not handle .json patches without data files. Still need JSON Manager for that.

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `crimsondesert` |
| Executable | `bin64/CrimsonDesert.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `bin64/CrimsonDesert.exe` |
| Executable (Demo) | `bin64/CrimsonDesert.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1746](https://www.nexusmods.com/site/mods/1746) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Crimson_Desert](https://www.pcgamingwiki.com/wiki/Crimson_Desert) |

## Supported Stores

- **Steam** — `3321460`
- **Epic Games Store** — `0230d0150e9f45d49dce401e1103c9fc`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `loadOrder` | `false` | true if game needs a load order |
| `hasLoader` | `false` | true if game needs a mod loader |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `needsModInstaller` | `false` | whether to install 0000-0035 folder mods to root - DISABLED since mod manager can handle |
| `rootInstaller` | `true` | enable root installer. Set false if you need to avoid installer collisions |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasUserIdFolder` | `true` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |
| `binariesInstaller` | `true` | only enable Binaries installer if not in root |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Plugin Loader | `crimsondesert-mod` | high | `{gamePath}/.` |
| Crimson Sharp Mod | `crimsondesert-browsermod` | high | `{gamePath}/mods` |
| Patch Mod | `crimsondesert-patchmod` | high | `{gamePath}/mods` |
| Root Folder | `crimsondesert-root` | high | `{gamePath}` |
| Tools | `crimsondesert-tools` | low | `{gamePath}` |
| Binaries (Engine Injector) | `crimsondesert-binaries` | high | `{gamePath}/bin64` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `crimsondesert-root` | 27 |
| `crimsondesert-tools` | 29 |
| `crimsondesert-specialpatchmod` | 31 |
| `crimsondesert-browsermod` | 32 |
| `crimsondesert-patchmod` | 33 |
| `crimsondesert-texture` | 34 |
| `crimsondesert-json` | 35 |
| `crimsondesert-vortexmod` | 33 |
| `crimsondesert-binaries` | 37 |
| `crimsondesert-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`bin64/CrimsonDesert.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download ${BROWSER_NAME} + Setup
- Download ${DMM_NAME}
- Download ${UAL_NAME}
- Download ${SAVE_EDITOR_NAME}
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

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

