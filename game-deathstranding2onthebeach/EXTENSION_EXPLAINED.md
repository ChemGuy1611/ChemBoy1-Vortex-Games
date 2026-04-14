# DEATH STRANDING 2: ON THE BEACH — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | DEATH STRANDING 2: ON THE BEACH Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `deathstranding2onthebeach` |
| Executable | `DS2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `DS2.exe` |
| Executable (Demo) | `DS2.exe` |

## Supported Stores

- **Steam** — `3280350`
- **Epic Games Store** — `0099fdb24c5442b09486de5feb33aa8d`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasLoader` | `false` | true if game needs a mod loader |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `multiExe` | `false` | set to true if there are multiple executable names |
| `multiModPath` | `false` | set to true if there are multiple possible mod paths (i.e. different path for Xbox version) |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `needsModInstaller` | `false` | set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing |
| `rootInstaller` | `false` | enable root installer. Set false if you need to avoid installer collisions |
| `fallbackInstaller` | `false` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |
| `binariesInstaller` | `false` | enables the Binaries folder installer (for engine injectors) |
| `modManagerInstalled` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| DS2 Manager Mod | `deathstranding2onthebeach-managermod` | high | `{gamePath}/mods` |
| DS2 Mod Manager | `deathstranding2onthebeach-modmanager` | low | `{gamePath}` |
| Root Folder | `deathstranding2onthebeach-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `deathstranding2onthebeach-loader` | 25 |
| `deathstranding2onthebeach-managermod` | 35 |
| `deathstranding2onthebeach-root` | 27 |
| `deathstranding2onthebeach-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download DS2 Mod Manager (Update)
- Open DS2 Mod Manager Page
- Open Config/Save Folder
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
