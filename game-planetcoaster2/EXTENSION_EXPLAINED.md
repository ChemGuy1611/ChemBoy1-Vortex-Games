# Planet Coaster 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Planet Coaster 2 Vortex Extension |
| Engine / Structure | Cobra Engine (ACSE) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `planetcoaster2` |
| Executable | `PlanetCoaster2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1103](https://www.nexusmods.com/site/mods/1103) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Planet_Coaster_2](https://www.pcgamingwiki.com/wiki/Planet_Coaster_2) |

## Supported Stores

- **Steam** — `2688950`
- **Epic Games Store** — `d945e57b9dde4510b664a581fead2819`
- **Xbox / Microsoft Store** — `FrontierDevelopmentsPlc.FDNewton`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| ACSE | `planetcoaster2-acse` | high | `{gamePath}/Win64/ovldata` |
| Root Game Folder | `planetcoaster2-root` | high | `{gamePath}` |
| ovldata Subfolder | `planetcoaster2-ovldata` | high | `{gamePath}/Win64` |
| Saves | `planetcoaster2-save` | high | `USER_HOME/Saved Games/Frontier Developments/Planet Coaster 2/USERID_FOLDER/Saves` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `planetcoaster2-acse` | 25 |
| `planetcoaster2-root` | 27 |
| `planetcoaster2-ovldata` | 29 |
| `planetcoaster2-save` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`PlanetCoaster2.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Save Folder
- Open Config Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| ACSE | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

