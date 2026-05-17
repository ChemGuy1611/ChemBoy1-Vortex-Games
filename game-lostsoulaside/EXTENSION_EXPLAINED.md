# Lost Soul Aside — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Lost Soul Aside Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `lostsoulaside` |
| Executable | `LostSoulAside.exe` |
| Executable (Demo) | `LostSoulAsideDemo.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1415](https://www.nexusmods.com/site/mods/1415) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Lost_Soul_Aside](https://www.pcgamingwiki.com/wiki/Lost_Soul_Aside) |

## Supported Stores

- **Steam** — `3378960`
- **Epic Games Store** — `8fe50ab7cb6b4ec586c8558036ecbbba`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |
| `CHECK_DOCS` | `false` |  |
| `DEMO` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `lostsoulaside-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `lostsoulaside-logicmods` | high | `{gamePath}/Projectlsa/Content/Paks/LogicMods` |
| UE4SS | `lostsoulaside-ue4ss` | high | `{gamePath}/Projectlsa/Binaries/Win64` |
| UE4SS Script Mod | `lostsoulaside-scripts` | high | `{gamePath}/Projectlsa/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `lostsoulaside-ue4ssdll` | high | `{gamePath}/Projectlsa/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `lostsoulaside-pak` | low | `{gamePath}/Projectlsa/Content/Paks` |
| Root Game Folder | `lostsoulaside-root` | high | `{gamePath}` |
| Content Folder | `lostsoulaside-contentfolder` | high | `{gamePath}` |
| Binaries (Engine Injector) | `lostsoulaside-binaries` | high | `{gamePath}/Projectlsa/Binaries/Win64` |
| UE Sortable Pak Mod | `lostsoulaside-uesortablepak` | 25 | `?` |
| Sig Bypass | `lostsoulaside-sigbypass` | 60 | `?` |
| Config | `lostsoulaside-config` | 45 | `?` |
| Saves | `lostsoulaside-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `lostsoulaside-ue4sscombo` | 25 |
| `lostsoulaside-logicmods` | 27 |
| `lostsoulaside-ue4ss` | 31 |
| `lostsoulaside-sigbypass` | 32 |
| `lostsoulaside-scripts` | 33 |
| `lostsoulaside-ue4ssdll` | 35 |
| `lostsoulaside-root` | 37 |
| `lostsoulaside-contentfolder` | 38 |
| `lostsoulaside-config` | 39 |
| `lostsoulaside-save` | 41 |
| `lostsoulaside-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Demo Launch** (`LostSoulAsideDemo.exe`)
- **Custom Launch** (`LostSoulAside.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

