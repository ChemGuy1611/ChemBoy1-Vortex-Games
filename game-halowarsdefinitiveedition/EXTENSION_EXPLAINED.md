# Halo Wars: Definitive Edition — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Halo Wars: Definitive Edition Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `halowarsdefinitiveedition` |
| Executable | `./xgameFinal.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `./xgameFinal.exe` |
| Executable (Demo) | `./xgameFinal.exe` |
| Extension Page | XXX |

## Supported Stores

- **Steam** — `459220`
- **Xbox / Microsoft Store** — `Microsoft.BulldogThreshold`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasLoader` | `false` | true if game needs a mod loader |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `rootInstaller` | `false` | enable root installer. Set false if you need to avoid installer collisions |
| `fallbackInstaller` | `false` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `halowarsdefinitiveedition-mod` | high | `{gamePath}/Mods` |
| Root Folder | `halowarsdefinitiveedition-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `halowarsdefinitiveedition-binaries` | high | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `halowarsdefinitiveedition-loader` | 25 |
| `halowarsdefinitiveedition-mod` | 27 |
| `halowarsdefinitiveedition-root` | 47 |
| `halowarsdefinitiveedition-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`./xgameFinal.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Mod Loader | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Save | `savegame` |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
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
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
