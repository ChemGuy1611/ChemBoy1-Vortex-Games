# Far Cry 5 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Far Cry 5 Vortex Extension |
| Engine / Structure | Far Cry Game (Mod Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `farcry5` |
| Executable | `bin/FarCry5.exe` |

## Supported Stores

- **Steam** — `552520`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `farcry5-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `farcry5-binaries` | high | `{gamePath}/bin` |
| Game Data | `farcry5-data` | high | `{gamePath}/data_final/pc` |
| FC Mod Installer | `farcry5-modinstaller` | high | `{gamePath}/FCModInstaller` |
| MIMOD_NAME | `MIMOD_ID` | high | `{gamePath}/MIMOD_PATH` |
| MIMODA3_NAME | `MIMODA3_ID` | high | `{gamePath}/MIMOD_PATH` |
| XML Settings Mod | `farcry5-xml` | high | `XML_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `farcry5-modinstaller` | 25 |
| `farcry5-root` | 27 |
| `farcry5-data` | 29 |
| `farcry5-binaries` | 31 |
| `MIMODA3_ID` | 33 |
| `MIMOD_ID` | 35 |
| `farcry5-xml` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Far Cry Mods Site
- Open Far Cry Mod Installer Site
- Open Config Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| FC Mod Installer | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
