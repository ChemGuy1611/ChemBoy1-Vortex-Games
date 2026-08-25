# XXX — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | XXX Vortex Extension |
| Engine / Structure | Godot Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `XXX` |
| Executable | `XXX.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `useOverrideCfg` | `false` | true to run loader setup in override.cfg mode instead of patching the game's .pck |
| `customLoader` | `true` | enables custom mod loader support |
| `keepZips` | `false` | downloaded tool archives are kept on disk after extraction |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Godot Mod | `XXX-mod` | high | `{gamePath}/mods-unpacked` |
| XXX | `XXX-XXX` | high | `{gamePath}/EXTRA_PATH` |
| Godot Mod Loader | `XXX-godotmodloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `XXX-godotmodloader` | 25 |
| `XXX-mod` | 27 |
| `XXX-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Run Mod Loader Setup** (`XXX.exe`)
- **Custom Launch** (`XXX.exe`)
- **Console Launch** (`XXX.console.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open override.cfg
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Godot Mod Loader | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

