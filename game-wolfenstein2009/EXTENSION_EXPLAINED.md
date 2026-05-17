# Wolfenstein (2009) — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Wolfenstein (2009) Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `wolfenstein2009` |
| Executable | `SP/Wolf2.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/985](https://www.nexusmods.com/site/mods/985) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Wolfenstein](https://www.pcgamingwiki.com/wiki/Wolfenstein) |

## Supported Stores

- **Steam** — `10170`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| SinglePlayer base Folder | `wolfenstein2009-spbase` | high | `{gamePath}/SP/base` |
| MultiPlayer base Folder | `wolfenstein2009-mpbase` | high | `{gamePath}/MP/base` |
| SP Folder | `wolfenstein2009-sp` | high | `{gamePath}/SP` |
| MP Folder | `wolfenstein2009-mp` | high | `{gamePath}/MP` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `wolfenstein2009-base` | 25 |
| `wolfenstein2009-maps` | 30 |
| `wolfenstein2009-streampacks` | 35 |
| `wolfenstein2009-videos` | 40 |
| `wolfenstein2009-pk4` | 45 |
| `wolfenstein2009-exe` | 50 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch SP Game** (`SP/Wolf2.exe`)
- **Launch MP Game** (`MP/Wolf2MP.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

