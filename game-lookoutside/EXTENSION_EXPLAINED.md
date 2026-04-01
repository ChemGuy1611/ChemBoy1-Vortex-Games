# Look Outside — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Look Outside Vortex Extension |
| Engine / Structure | RPGMaker Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `lookoutside` |
| Executable | `Game.exe` |

## Supported Stores

- **Steam** — `3373660`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| js folder | `lookoutside-jsfolder` | high | `{gamePath}/.` |
| js file | `lookoutside-jsfile` | high | `{gamePath}/js/plugins` |
| Root Folder | `lookoutside-root` | high | `{gamePath}` |
| JSON Mod | `lookoutside-json` | high | `{gamePath}/data` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `lookoutside-jsfolder` | 25 |
| `lookoutside-jsfile` | 27 |
| `lookoutside-root` | 29 |
| `lookoutside-json` | 31 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open plugins.js File
- View Changelog
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
