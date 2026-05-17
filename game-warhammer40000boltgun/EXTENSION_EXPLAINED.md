# Warhammer 40,000: Boltgun — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | WH40K Boltgun Vortex Extension |
| Engine / Structure | UE4 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `warhammer40000boltgun` |
| Executable | `N/A` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/679](https://www.nexusmods.com/site/mods/679) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Warhammer_40%2C000%3A_Boltgun](https://www.pcgamingwiki.com/wiki/Warhammer_40%2C000%3A_Boltgun) |

## Supported Stores

- **Steam** — `2005010`
- **Epic Games Store** — `7425a2db41cf4574a957363a79813ac1`
- **GOG** — `2028053392`
- **Xbox / Microsoft Store** — `FocusHomeInteractiveSA.Boltgun-Windows`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `FBLO` | `true` | enables the full-featured load order page (false uses the legacy page) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `warhammer40000boltgun-root` | 25 | `?` |
| UE Sortable Pak Mod | `warhammer40000boltgun-uesortablepak` | 25 | `?` |
| UE4SS Script-LogicMod Combo | `warhammer40000boltgun-ue4sscombo` | 26 | `?` |
| UE4SS LogicMods (Blueprint) | `warhammer40000boltgun-logicmods` | 28 | `?` |
| UE4SS Script Mod | `warhammer40000boltgun-scripts` | 50 | `?` |
| UE4SS DLL Mod | `warhammer40000boltgun-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `warhammer40000boltgun-binaries` | 54 | `?` |
| UE4SS | `warhammer40000boltgun-ue4ss` | 56 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `warhammer40000boltgun-ue4sscombo` | 26 |
| `warhammer40000boltgun-logicmods` | 27 |
| `warhammer40000boltgun-uesortablepak` | 29 |
| `warhammer40000boltgun-ue4ss` | 31 |
| `warhammer40000boltgun-scripts` | 35 |
| `warhammer40000boltgun-ue4ssdll` | 37 |
| `warhammer40000boltgun-root` | 39 |
| `warhammer40000boltgun-binaries` | 49 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open UE4SS Mods Folder
- Download UE4SS
- Open UE4SS Settings INI
- Open UE4SS mods.json
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Load Order** — mods are assigned numbered folder names or sorted based on their position in the load order.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

