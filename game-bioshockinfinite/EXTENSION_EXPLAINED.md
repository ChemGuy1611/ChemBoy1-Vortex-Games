# BioShock Infinite — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | BioShock Infinite Vortex Extension |
| Engine / Structure | UE2/3 Game (TFC Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `bioshockinfinite` |
| Executable | `Binaries/Win32/BioShockInfinite.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `8870`
- **Epic Games Store** — `f9d6f0530ea140909f8e8a997a7532d7`
- **GOG** — `1752654506`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| TFC Mod | `bioshockinfinite-tfcmod` | high | `{gamePath}/TFCInstaller/Mods` |
| Movies Mod | `bioshockinfinite-movies` | high | `{gamePath}/XGame/Movies` |
| Root Folder | `bioshockinfinite-root` | high | `{gamePath}` |
| Root Sub Folder | `bioshockinfinite-rootsub` | high | `{gamePath}/XGame` |
| Cooked Sub Folder | `bioshockinfinite-cookedsub` | high | `{gamePath}/XGame/CookedPCConsole_FR` |
| Binaries (Engine Injector) | `bioshockinfinite-binaries` | high | `{gamePath}/Binaries/Win32` |
| TFC Installer | `bioshockinfinite-tfcinstaller` | low | `{gamePath}/.` |
| UPK Explorer | `bioshockinfinite-tfcexplorer` | low | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `bioshockinfinite-tfcinstaller` | 25 |
| `bioshockinfinite-tfcexplorer` | 27 |
| `bioshockinfinite-tfcmod` | 29 |
| `bioshockinfinite-root` | 31 |
| `bioshockinfinite-cookedsub` | 33 |
| `bioshockinfinite-movies` | 35 |
| `bioshockinfinite-binaries` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

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
