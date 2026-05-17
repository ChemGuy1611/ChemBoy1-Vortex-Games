# Keeper — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Keeper Vortex Extension |
| Engine / Structure | UE5 (Xbox-Integrated) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `keeper` |
| Executable | `Keeper.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Keeper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1504](https://www.nexusmods.com/site/mods/1504) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Keeper](https://www.pcgamingwiki.com/wiki/Keeper) |

## Supported Stores

- **Steam** — `3043580`
- **Xbox / Microsoft Store** — `Microsoft.PaganIdol`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `keeper-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `keeper-logicmods` | high | `{gamePath}/PaganIdol/Content/Paks/LogicMods` |
| Root Game Folder | `keeper-root` | high | `{gamePath}` |
| Content Folder | `keeper-contentfolder` | high | `{gamePath}/PaganIdol` |
| Paks (no "~mods") | `keeper-pakalt` | high | `{gamePath}/PaganIdol/Content/Paks` |
| UE5 Sortable Mod | `keeper-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `keeper-scripts` | 50 | `?` |
| UE4SS DLL Mod | `keeper-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `keeper-binaries` | 54 | `?` |
| UE4SS | `keeper-ue4ss` | 56 | `?` |
| Config (LocalAppData) | `keeper-config` | 60 | `?` |
| Saves (LocalAppData) | `keeper-save` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `keeper-ue4sscombo` | 25 |
| `keeper-logicmods` | 27 |
| `keeper-ue4ss` | 31 |
| `keeper-scripts` | 33 |
| `keeper-ue4ssdll` | 35 |
| `keeper-root` | 37 |
| `keeper-contentfolder` | 39 |
| `keeper-config` | 41 |
| `keeper-save` | 43 |
| `keeper-binaries` | 49 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
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

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

