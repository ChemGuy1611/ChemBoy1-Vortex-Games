# Like a Dragon: Pirate Yakuza in Hawaii — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Like a Dragon: Pirate Yakuza in Hawaii Vortex Extension |
| Engine / Structure | SRMM Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `likeadragonpirateyakuzainhawaii` |
| Executable | `runtime/media/startup.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1191](https://www.nexusmods.com/site/mods/1191) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Like_a_Dragon%3A_Pirate_Yakuza_in_Hawaii](https://www.pcgamingwiki.com/wiki/Like_a_Dragon%3A_Pirate_Yakuza_in_Hawaii) |

## Supported Stores

- **Steam** — `3061810`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasUserIdFolder` | `true` | true if there is a user ID folder in the Save path that must be read (i.e. Steam ID) |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `needsModInstaller` | `true` | set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing |
| `rootInstaller` | `true` | enable root installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `likeadragonpirateyakuzainhawaii-root` | high | `{gamePath}/runtime/media` |
| SRMM Mod | `likeadragonpirateyakuzainhawaii-mod` | high | `{gamePath}/runtime/media/mods` |
| .par Data File | `likeadragonpirateyakuzainhawaii-data` | high | `{gamePath}/runtime/media/data` |
| Shin Ryu MM | `likeadragonpirateyakuzainhawaii-modmanager` | low | `{gamePath}/runtime/media` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `likeadragonpirateyakuzainhawaii-modmanager` | 25 |
| `likeadragonpirateyakuzainhawaii-mod` | 27 |
| `likeadragonpirateyakuzainhawaii-data` | 29 |
| `likeadragonpirateyakuzainhawaii-root` | 27 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game** (`shinryumodmanager.exe`)
- **Launch (No Mods)** (`runtime/media/startup.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Save Folder
- Open Config Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

