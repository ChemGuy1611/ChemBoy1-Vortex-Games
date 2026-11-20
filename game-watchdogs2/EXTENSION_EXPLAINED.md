# Watch_Dogs 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Watch_Dogs 2 Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `watchdogs2` |
| Executable | `bin/WatchDogs2.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/2630](https://www.nexusmods.com/site/mods/2630) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Watch_Dogs_2](https://www.pcgamingwiki.com/wiki/Watch_Dogs_2) |

## Supported Stores

- **Steam** — `447040`
- **Epic Games Store** — `Angelonia`
- **Ubisoft Connect** — `2688`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasLoader` | `true` | true if game needs a mod loader |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `needsModInstaller` | `true` | set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing |
| `rootInstaller` | `true` | enable root installer. Set false if you need to avoid installer collisions |
| `saveInstaller` | `false` | enable save installer. Set false if path is outside of game folder |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasUserIdFolder` | `true` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `binariesInstaller` | `true` | enables the Binaries folder installer (for engine injectors) |
| `loaderAutoDownload` | `false` | true to download Disrupt Manager during setup. false to offer the download only once a Disrupt Manager package is deployed |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `watchdogs2-root` | high | `{gamePath}` |
| Patch Archive | `watchdogs2-mod` | high | `{gamePath}/data_win64` |
| Disrupt Manager Package | `watchdogs2-package` | high | `{gamePath}/Disrupt_Manager/Watch Dogs 2` |
| ScriptHook Script | `watchdogs2-script` | high | `{gamePath}/bin/ScriptHook/data/scripts` |
| Disrupt Manager | `watchdogs2-loader` | 70 | `{gamePath}/Disrupt_Manager` |
| Binaries (Engine Injector) | `watchdogs2-binaries` | 72 | `{gamePath}/bin` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `watchdogs2-loader` | 25 |
| `watchdogs2-package` | 26 |
| `watchdogs2-root` | 27 |
| `watchdogs2-script` | 28 |
| `watchdogs2-binaries` | 29 |
| `watchdogs2-mod` | 35 |
| `watchdogs2-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`bin/WatchDogs2.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config File
- Open Save Folder
- Open PCGamingWiki Page
- Open Nexus Mods Page
- Open SteamDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Disrupt Manager | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
