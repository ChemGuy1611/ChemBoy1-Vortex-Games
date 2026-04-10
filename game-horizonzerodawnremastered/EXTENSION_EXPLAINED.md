# Horizon Zero Dawn Remastered — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Horizon Zero Dawn Remastered Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `horizonzerodawnremastered` |
| Executable | `HorizonZeroDawnRemastered.exe` |

## Supported Stores

- **Steam** — `2561580`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Save Game (Documents) | `horizonzerodawnremastered-save` | high | `SAVE_PATH` |
| Package (Game Data) | `PACKAGE_ID` | high | `{gamePath}/PACKAGE_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `horizonzerodawnremastered-save` | 25 |
| `horizonzerodawnremastered-package` | 30 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

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
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
