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
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1703](https://www.nexusmods.com/site/mods/1703) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Unreal_Tournament_2004](https://www.pcgamingwiki.com/wiki/Unreal_Tournament_2004) |

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasLoader` | `false` | true if game needs a mod loader |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| OldUnreal Patch | `unrealtournament2004-mod` | high | `{gamePath}` |
| Binaries (Engine Injector) | `unrealtournament2004-binaries` | high | `{gamePath}/System` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `unrealtournament2004-mod` | 27 |
| `unrealtournament2004-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`System/UT2004.exe`)

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

