# Nioh 2 — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Nioh 2 Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |
| Version | 0.1.1 |
| Date | 2025-02-04 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `nioh2` |
| Executable | `nioh2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `1325200`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Mod | `nioh2-mod` | high | `{gamePath}/Mods` |
| Root Folder | `nioh2-root` | high | `{gamePath}` |
| Mod Loader | `nioh2-loader` | low | `{gamePath}/.` |
| Config | `nioh2-config` | low | `{gamePath}/CONFIG_PATH` |
| Save | `nioh2-save` | low | `{gamePath}/SAVE_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `nioh2-loader` | 25 |
| `nioh2-mod` | 27 |
| `nioh2-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| Mod Loader | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
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
