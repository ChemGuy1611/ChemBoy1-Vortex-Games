# Deus Ex — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Deus Ex Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `deusex` |
| Executable | `System/DeusEx.exe` |

## Supported Stores

- **Steam** — `6910`
- **GOG** — `1207658995`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Deus Exe (Launcher) | `deusex-launcher` | high | `{gamePath}/System` |
| Mod Folder | `deusex-mod` | high | `{gamePath}/.` |
| Root Folder | `deusex-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `deusex-binaries` | high | `{gamePath}/System` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `deusex-mod` | 25 |
| `deusex-root` | 27 |
| `deusex-launcher` | 29 |
| `deusex-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Community Update Launch**
- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open user.ini
- Open Save Folder
- Open moddb.com Page
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

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
