# Europa Universalis IV — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Europa Universalis IV Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `europauniversalisiv` |
| Executable | `./eu4.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1526](https://www.nexusmods.com/site/mods/1526) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Europa_Universalis_IV](https://www.pcgamingwiki.com/wiki/Europa_Universalis_IV) |

## Supported Stores

- **Steam** — `236850`
- **Epic Games Store** — `da0103e959e54d139d0c109ded3b3672`
- **GOG** — `2057001589`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod (Documents) | `europauniversalisiv-mod` | high | `game/mod` |
| Root Folder | `europauniversalisiv-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `europauniversalisiv-binaries` | high | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `europauniversalisiv-mod` | 25 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`./eu4.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

