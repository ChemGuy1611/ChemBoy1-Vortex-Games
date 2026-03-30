# Slay the Spire 2 — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Slay the Spire 2 Vortex Extension |
| Engine / Structure | Basic Game - GODOT Engine |
| Author | ChemBoy1 |
| Version | 0.1.1 |
| Date | 2026-03-16 |

### Notes

- Game is GODOT Engine with a built-in mod loader
- Separate save folders for vanilla and modded saves

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `slaythespire2` |
| Executable | `SlayTheSpire2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `SlayTheSpire2.exe` |
| Executable (Demo) | `SlayTheSpire2.exe` |
| Extension Page | XXX |

## Supported Stores

- **Steam** — `2868840`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `hasLoader` | `false` | true if game needs a mod loader |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `rootInstaller` | `true` | enable root installer. Set false if you need to avoid installer collisions |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasUserIdFolder` | `true` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |
| `binariesInstaller` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Mod | `slaythespire2-mod` | high | `{gamePath}/mods` |
| Root Folder | `slaythespire2-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `slaythespire2-loader` | 25 |
| `slaythespire2-root` | 27 |
| `slaythespire2-mod` | 29 |
| `slaythespire2-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`SlayTheSpire2.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Save Folder (Modded)
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
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
