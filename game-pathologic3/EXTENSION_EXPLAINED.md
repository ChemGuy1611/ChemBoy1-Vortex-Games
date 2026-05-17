# Pathologic 3 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Pathologic 3 Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `pathologic3` |
| Executable | `Pathologic3.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Pathologic3.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1629](https://www.nexusmods.com/site/mods/1629) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Pathologic_3](https://www.pcgamingwiki.com/wiki/Pathologic_3) |

## Supported Stores

- **Steam** — `3199650`
- **GOG** — `1567359699`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasLoader` | `true` | true if game needs a mod loader |
| `rootInstaller` | `true` | enable root installer. Usually disabled to avoid installer collisions |
| `fallbackInstaller` | `true` | enable fallback installer. Usually disabled to avoid installer collisions |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `pathologic3-mod` | high | `{gamePath}/Mods` |
| Root Folder | `pathologic3-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `pathologic3-binaries` | high | `{gamePath}/.` |
| P2ModLoader | `pathologic3-loader` | 70 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `pathologic3-loader` | 25 |
| `pathologic3-mod` | 27 |
| `pathologic3-root` | 29 |
| `pathologic3-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Pathologic3.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

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
| P2ModLoader | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

