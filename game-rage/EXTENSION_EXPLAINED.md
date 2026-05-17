# RAGE — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | RAGE Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `rage` |
| Executable | `./Rage64.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1639](https://www.nexusmods.com/site/mods/1639) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Rage](https://www.pcgamingwiki.com/wiki/Rage) |

## Supported Stores

- **Steam** — `9200`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasLoader` | `true` | true if game needs a mod loader |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `rootInstaller` | `true` | enable root installer. Set false if you need to avoid installer collisions |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `true` | enable to show the user a notification with special instructions (specify below) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `rage-mod` | high | `{gamePath}/mods` |
| Root Folder | `rage-root` | high | `{gamePath}` |
| Config | `rage-config` | high | `{gamePath}/SAVES/base` |
| id5Tweaker | `rage-loader` | 70 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `rage-loader` | 25 |
| `rage-mod` | 27 |
| `rage-root` | 47 |
| `rage-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch (.bat)** (`launch.bat`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open ${LOADER_INI}
- Open Cache Folder
- Open Config Folder
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| id5Tweaker | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `SAVES/base` |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

