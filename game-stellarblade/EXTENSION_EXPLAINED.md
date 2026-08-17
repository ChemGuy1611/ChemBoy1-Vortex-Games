# Stellar Blade — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Stellar Blade Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `stellarblade` |
| Executable | `SB.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1324](https://www.nexusmods.com/site/mods/1324) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Stellar_Blade](https://www.pcgamingwiki.com/wiki/Stellar_Blade) |

## Supported Stores

- **Steam** — `3489700`
- **Epic Games Store** — `4013d48a20c1403282fc9d1453ec8f5a`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |
| `CHECK_DOCS` | `false` |  |
| `mod_update_all_profile` | `false` | for mod update to keep them in the load order and not uncheck them |
| `updating_mod` | `false` | used to see if it's a mod update or not |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `FBLO` | `true` | set to false to use legacy load order page |
| `ue4ssLoadOrder` | `true` | master toggle for UE4SS support: UE4SS/Scripts/DLL/LogicMods mod types and installers, UE4SS buttons, load order page, and mods.txt writing |
| `logicModsLoadOrder` | `true` | enable load order page and load_order.txt writing for LogicMods/Blueprint pak mods |
| `collectionsLoadOrder` | `true` | include UE4SS and LogicMods load orders in collections (ANDed with the toggles above) |
| `autoDownloadUe4ss` | `true` | toggle for auto downloading UE4SS (only applies when ue4ssLoadOrder is enabled) |
| `writeEngineVersion` | `false` | toggle to write ENGINE_VERSION into UE4SS-settings.ini (EngineVersionOverride) on deploy, when UE4SS is installed |
| `debug` | `false` | toggle for debug mode |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `stellarblade-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `stellarblade-logicmods` | high | `{gamePath}/SB/Content/Paks/LogicMods` |
| UE4SS | `stellarblade-ue4ss` | high | `{gamePath}/SB/Binaries/Win64` |
| UE4SS Script Mod | `stellarblade-scripts` | high | `{gamePath}/SB/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `stellarblade-ue4ssdll` | high | `{gamePath}/SB/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `stellarblade-pak` | low | `{gamePath}/SB/Content/Paks` |
| Root Game Folder | `stellarblade-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `stellarblade-binaries` | high | `{gamePath}/SB/Binaries/Win64` |
| Movie Mod (.bk2) | `stellarblade-movie` | high | `{gamePath}/SB/Content/Movies` |
| Menu Mod (.bk2/.webm) | `stellarblade-menu` | high | `{gamePath}/SB/Content/Movies/Menu` |
| Splash Screen | `stellarblade-splash` | high | `{gamePath}/SB/Content/Splash` |
| CNS JSON Mod | `stellarblade-cnsjson` | high | `{gamePath}/SB/Content/Paks/~mods/CustomNanosuitSystem` |
| UE Sortable Pak Mod | `stellarblade-uesortablepak` | 25 | `?` |
| Config | `stellarblade-config` | 45 | `?` |
| Saves | `stellarblade-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `stellarblade-ue4sscombo` | 25 |
| `stellarblade-logicmods` | 27 |
| `stellarblade-ue4ss` | 29 |
| `stellarblade-scripts` | 31 |
| `stellarblade-ue4ssdll` | 33 |
| `stellarblade-uesortablepak` | 35 |
| `stellarblade-root` | 37 |
| `stellarblade-config` | 39 |
| `stellarblade-save` | 41 |
| `stellarblade-menu` | 43 |
| `stellarblade-movie` | 45 |
| `stellarblade-splash` | 47 |
| `stellarblade-cnsjson` | 48 |
| `stellarblade-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`SB.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS (GitHub)
- Open UE4SS Settings INI
- Open UE4SS mods.txt
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Load Order** — mods are assigned numbered folder names or sorted based on their position in the load order.
- **UE4SS Load Order** — manages UE4SS script/DLL mod load order via a dedicated page; serializes order to `mods.txt` on deploy.
- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

