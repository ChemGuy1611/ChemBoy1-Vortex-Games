# Far Cry New Dawn — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Far Cry New Dawn Vortex Extension |
| Engine / Structure | Far Cry Game (Mod Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `farcrynewdawn` |
| Executable | `bin/FarCryNewDawn.exe` |

## Supported Stores

- **Steam** — `939960`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `farcrynewdawn-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `farcrynewdawn-binaries` | high | `{gamePath}/bin` |
| Game Data | `farcrynewdawn-data` | high | `{gamePath}/data_final/pc` |
| FC Mod Installer | `farcrynewdawn-modinstaller` | high | `{gamePath}/FCModInstaller` |
| MIMOD_NAME | `MIMOD_ID` | high | `{gamePath}/MIMOD_PATH` |
| MIMODA3_NAME | `MIMODA3_ID` | high | `{gamePath}/MIMOD_PATH` |
| XML Settings Mod | `farcrynewdawn-xml` | high | `XML_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `farcrynewdawn-modinstaller` | 25 |
| `farcrynewdawn-root` | 27 |
| `farcrynewdawn-data` | 29 |
| `farcrynewdawn-binaries` | 31 |
| `MIMODA3_ID` | 33 |
| `MIMOD_ID` | 35 |
| `farcrynewdawn-xml` | 37 |

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
