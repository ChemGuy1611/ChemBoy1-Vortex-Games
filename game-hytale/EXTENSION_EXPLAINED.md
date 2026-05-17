# Hytale — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Hytale Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `hytale` |
| Executable | `HytaleClient.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [XXX](XXX) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Hytale](https://www.pcgamingwiki.com/wiki/Hytale) |

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasLoader` | `false` | true if game needs a mod loader |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `rootInstaller` | `false` | enable root installer. Set false if you need to avoid installer collisions |
| `fallbackInstaller` | `false` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `hytale-mod` | high | `{gamePath}/UserData/Mods` |
| Root Folder | `hytale-root` | low | `{gamePath}` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`HytaleClient.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Mod Loader | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `UserData` |
| Save | `UserData/Saves` |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

