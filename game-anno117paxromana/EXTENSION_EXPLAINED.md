# Anno 117: Pax Romana — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Anno 117: Pax Romana Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `anno117paxromana` |
| Executable | `Bin/Win64/Anno117.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1531](https://www.nexusmods.com/site/mods/1531) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Anno_117%3A_Pax_Romana](https://www.pcgamingwiki.com/wiki/Anno_117%3A_Pax_Romana) |

## Supported Stores

- **Steam** — `3274580`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `anno117paxromana-mod` | high | `{gamePath}/mods` |
| Root Folder | `anno117paxromana-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `anno117paxromana-binaries` | high | `{gamePath}/Bin/Win64` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `anno117paxromana-mod` | 25 |
| `anno117paxromana-root` | 47 |
| `anno117paxromana-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Bin/Win64/Anno117.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

