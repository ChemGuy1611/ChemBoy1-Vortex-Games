# Deus Ex: Mankind Divided — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Deus Ex: Mankind Divided Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `deusexmankinddivided` |
| Executable | `retail/DXMD.exe` |

## Supported Stores

- **Steam** — `337000`
- **GOG** — `1296690054`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| runtime file | `deusexmankinddivided-runtime` | high | `{gamePath}/runtime` |
| DLC runtime file | `deusexmankinddivided-dlcruntime` | high | `{gamePath}/DLC/runtime` |
| Root Folder | `deusexmankinddivided-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `deusexmankinddivided-binaries` | high | `{gamePath}/retail` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `deusexmankinddivided-root` | 25 |
| `deusexmankinddivided-runtime` | 27 |
| `deusexmankinddivided-dlcruntime` | 29 |
| `deusexmankinddivided-binaries` | 29 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Save Folder (GOG)
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
