# Unreal Tournament 2004 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Unreal Tournament 2004 Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `unrealtournament2004` |
| Executable | `System/UT2004.exe` |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| MOD_NAME | `MOD_ID` | high | `{gamePath}` |
| BINARIES_NAME | `BINARIES_ID` | high | `{gamePath}/System` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `MOD_ID` | 27 |
| `unrealtournament2004-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download OldUnreal Patches (Browse)
- Open OldUnreal Page
- Open Engine Settings File
- Open User Settings File
- Open Save Folder
- Open PCGamingWiki Page
- Open Unreal Wiki Page
- Open OldUnreal Page
- Open ModDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

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
