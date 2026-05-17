# Europa Universalis V — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Europa Universalis V Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `europauniversalisv` |
| Executable | `binaries/eu5.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1524](https://www.nexusmods.com/site/mods/1524) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Europa_Universalis_V](https://www.pcgamingwiki.com/wiki/Europa_Universalis_V) |

## Supported Stores

- **Steam** — `3450310`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod (Documents) | `europauniversalisv-mod` | high | `game/mod` |
| Root Folder | `europauniversalisv-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `europauniversalisv-binaries` | high | `{gamePath}/binaries` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `europauniversalisv-mod` | 25 |
| `europauniversalisv-root` | 47 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`binaries/eu5.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

