# Sacred 2 Remaster — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Sacred 2 Remaster Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `sacred2remaster` |
| Executable | `./sacred2.exe` |

## Supported Stores

- **Steam** — `3906660`
- **GOG** — `2041849309`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `sacred2remaster-root` | high | `{gamePath}` |
| Root Sub-Folder | `sacred2remaster-rootsub` | high | `{gamePath}/Remaster` |
| Textures Sub-Folder | `sacred2remaster-texturesub` | high | `{gamePath}/Remaster/Textures` |
| UI Sub-Folder | `sacred2remaster-uisub` | high | `{gamePath}/Remaster/ui` |
| Paks Sub-Folder | `sacred2remaster-paksub` | high | `{gamePath}/pak` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `sacred2remaster-root` | 25 |
| `sacred2remaster-fallback` | 40 |

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
