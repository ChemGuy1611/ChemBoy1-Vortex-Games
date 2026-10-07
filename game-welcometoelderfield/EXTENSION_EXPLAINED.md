# Welcome to Elderfield — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Welcome to Elderfield Vortex Extension |
| Engine / Structure | RPGMaker Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `welcometoelderfield` |
| Executable | `Game.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/2429](https://www.nexusmods.com/site/mods/2429) |
| PCGamingWiki | [https://www.pcgamingwiki.com/](https://www.pcgamingwiki.com/) |

## Supported Stores

- **Steam** — `3195440`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `true` | enable to show the user a notification with special instructions (specify below) - default true: plugins.js manual-update reminder is always relevant |
| `debug` | `false` | toggle for debug mode |
| `isPurging` | `false` | guards plugins.js writes during a purge cycle - see the will-purge/did-deploy listeners in main() |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| js folder | `welcometoelderfield-jsfolder` | high | `{gamePath}/.` |
| js file | `welcometoelderfield-jsfile` | high | `{gamePath}/js/plugins` |
| Root Folder | `welcometoelderfield-root` | high | `{gamePath}` |
| JSON Mod | `welcometoelderfield-json` | high | `{gamePath}/data` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `welcometoelderfield-jsfolder` | 25 |
| `welcometoelderfield-jsfile` | 27 |
| `welcometoelderfield-root` | 29 |
| `welcometoelderfield-json` | 31 |
| `welcometoelderfield-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Game.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open plugins.js File
- Open PCGamingWiki Page
- Open Nexus Mods Page
- Open SteamDB Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
