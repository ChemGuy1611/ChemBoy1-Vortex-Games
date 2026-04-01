# Painkiller: Black Edition — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Painkiller: Black Edition Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `painkillerblackedition` |
| Executable | `Bin/Painkiller.exe` |

## Supported Stores

- **Steam** — `39530`
- **GOG** — `1207658715`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Data Mod | `painkillerblackedition-mod` | high | `{gamePath}/Data` |
| Root Folder | `painkillerblackedition-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `painkillerblackedition-binaries` | high | `{gamePath}/Bin` |
| Save | `painkillerblackedition-save` | high | `{gamePath}/SaveGames` |
| Config | `painkillerblackedition-config` | high | `{gamePath}/Bin` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `painkillerblackedition-root` | 25 |
| `painkillerblackedition-mod` | 27 |
| `painkillerblackedition-config` | 29 |
| `painkillerblackedition-save` | 31 |
| `painkillerblackedition-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open moddb.com page
- Open config.ini
- Open Save Folder
- View Changelog
- Open Downloads Folder

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `Bin` |
| Save | `SaveGames` |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.

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
