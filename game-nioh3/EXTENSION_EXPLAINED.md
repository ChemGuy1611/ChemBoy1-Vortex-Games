# Nioh 3 — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Nioh 3 Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |
| Version | 0.3.0 |
| Date | 2026-03-09 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `nioh3` |
| Executable | `Nioh3.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Nioh3.exe` |
| Executable (Demo) | `Nioh3.exe` |

## Supported Stores

- **Steam** — `3681010`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `reZip` | `true` | rezip mods for ModManager |
| `loadOrderEnabled` | `false` | true to use load order sorting |
| `modInstallerEnabled` | `true` | enable mod installer (once mod loader is added) |
| `hasLoader` | `true` | for DLL Loader |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `rootInstaller` | `false` | enable root installer. Set false if you need to avoid installer collisions |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `true` | enable to show the user a notification with special instructions (specify below) |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Root Folder | `nioh3-root` | high | `{gamePath}` |
| Plugin Mod | `nioh3-loadermod` | high | `{gamePath}/plugins` |
| Loose File Loader | `nioh3-looseloader` | low | `{gamePath}/plugins` |
| .fdata Package (Yumia) | `nioh3-fdatayumia` | high | `{gamePath}/.` |
| Loose Mod (RDBExplorer) | `nioh3-rdbmod` | high | `{gamePath}/package/RDBExplorer_Mods` |
| Yumia fdata Tools | `nioh3-yumia` | low | `{gamePath}/package` |
| RDBExplorer | `nioh3-rdbexplorer` | low | `{gamePath}/package` |
| ModManager | `nioh3-modmanager` | low | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `nioh3-dllloader` | 25 |
| `nioh3-rdbexplorer` | 26 |
| `nioh3-yumia` | 27 |
| `nioh3-looseloader` | 28 |
| `nioh3-modmanager` | 29 |
| `nioh3-mod` | 31 |
| `nioh3-mod` | 31 |
| `nioh3-loadermod` | 33 |
| `nioh3-fdatayumia` | 35 |
| `nioh3-root` | 47 |
| `nioh3-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Run Merge (Yumia)
- Reset root.rdb Files (Yumia)
- Download ${RDBEXPLORER_NAME}
- Open Config Folder
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| DLL Plugin Loader | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
