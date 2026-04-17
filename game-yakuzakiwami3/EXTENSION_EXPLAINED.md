# Yakuza Kiwami 3 & Dark Ties — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Yakuza Kiwami 3 & Dark Ties Vortex Extension |
| Engine / Structure | SRMM Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `yakuzakiwami3` |
| Executable | `runtime/media/startup.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `3937550`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasUserIdFolder` | `true` | true if there is a user ID folder in the Save path that must be read (i.e. Steam ID) |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `multiExe` | `false` | set to true if there are multiple executable names |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `needsModInstaller` | `true` | set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing |
| `rootInstaller` | `true` | enable root installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `yakuzakiwami3-root` | high | `{gamePath}/runtime/media` |
| SRMM Mod | `yakuzakiwami3-mod` | high | `{gamePath}/runtime/media/mods` |
| .par Data File | `yakuzakiwami3-data` | high | `{gamePath}/runtime/media/data` |
| Shin Ryu MM | `yakuzakiwami3-modmanager` | low | `{gamePath}/runtime/media` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `yakuzakiwami3-modmanager` | 25 |
| `yakuzakiwami3-mod` | 27 |
| `yakuzakiwami3-data` | 29 |
| `yakuzakiwami3-root` | 27 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game**
- **Launch (No Mods)**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex links/copies to game folder
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
