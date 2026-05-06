# Batman: Arkham City — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Batman: Arkham City Vortex Extension |
| Engine / Structure | UE 2-3 Game + TFC Installer |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `batmanarkhamcity` |
| Executable | `Binaries/Win32/BmLauncher.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `200260`
- **Epic Games Store** — `Egret`
- **GOG** — `1260066469`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| TFC Mod | `batmanarkhamcity-tfcmod` | high | `{gamePath}/TFCInstaller/Mods` |
| Root Folder | `batmanarkhamcity-root` | high | `{gamePath}` |
| Root Sub Folder | `batmanarkhamcity-rootsub` | high | `{gamePath}/BmGame` |
| Cooked Sub Folder | `batmanarkhamcity-cookedsub` | high | `{gamePath}/BmGame/CookedPCConsole` |
| Binaries (Engine Injector) | `batmanarkhamcity-binaries` | high | `{gamePath}/Binaries/Win32` |
| Movies Mod | `batmanarkhamcity-movies` | high | `{gamePath}/BmGame/Movies` |
| TFC Installer | `batmanarkhamcity-tfcinstaller` | low | `{gamePath}/.` |
| UPK Explorer | `batmanarkhamcity-tfcexplorer` | low | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `batmanarkhamcity-tfcinstaller` | 25 |
| `batmanarkhamcity-tfcexplorer` | 27 |
| `batmanarkhamcity-tfcmod` | 29 |
| `batmanarkhamcity-root` | 31 |
| `batmanarkhamcity-cookedsub` | 33 |
| `batmanarkhamcity-movies` | 35 |
| `batmanarkhamcity-binaries` | 37 |
| `batmanarkhamcity-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
