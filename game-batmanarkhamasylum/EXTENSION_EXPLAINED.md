# Batman: Arkham Asylum — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Batman: Arkham Asylum Vortex Extension |
| Engine / Structure | UE2/3 Game (TFC Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `batmanarkhamasylum` |
| Executable | `Binaries/BmLauncher.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `35140`
- **Epic Games Store** — `Godwit`
- **GOG** — `1482504285`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| TFC Mod | `batmanarkhamasylum-tfcmod` | high | `{gamePath}/TFCInstaller/Mods` |
| Root Folder | `batmanarkhamasylum-root` | high | `{gamePath}` |
| Root Sub Folder | `batmanarkhamasylum-rootsub` | high | `{gamePath}/BmGame` |
| Cooked Sub Folder | `batmanarkhamasylum-cookedsub` | high | `{gamePath}/BmGame/CookedPC` |
| Binaries (Engine Injector) | `batmanarkhamasylum-binaries` | high | `{gamePath}/Binaries` |
| Movies Mod | `batmanarkhamasylum-movies` | high | `{gamePath}/BmGame/Movies` |
| TFC Installer | `batmanarkhamasylum-tfcinstaller` | low | `{gamePath}/.` |
| UPK Explorer | `batmanarkhamasylum-tfcexplorer` | low | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `batmanarkhamasylum-tfcinstaller` | 25 |
| `batmanarkhamasylum-tfcexplorer` | 27 |
| `batmanarkhamasylum-tfcmod` | 29 |
| `batmanarkhamasylum-root` | 31 |
| `batmanarkhamasylum-cookedsub` | 33 |
| `batmanarkhamasylum-movies` | 35 |
| `batmanarkhamasylum-binaries` | 37 |

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
