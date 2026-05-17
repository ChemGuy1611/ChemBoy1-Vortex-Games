# WUCHANG: Fallen Feathers — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | WUCHANG: Fallen Feathers Vortex Extension |
| Engine / Structure | UE5 (Xbox-Integrated) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `wuchangfallenfeathers` |
| Executable | `Project_Plague.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1385](https://www.nexusmods.com/site/mods/1385) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Wuchang%3A_Fallen_Feathers](https://www.pcgamingwiki.com/wiki/Wuchang%3A_Fallen_Feathers) |

## Supported Stores

- **Steam** — `2277560`
- **Epic Games Store** — `ebfa14ea910a4e55a48ccf5daf6c2607`
- **Xbox / Microsoft Store** — `505GAMESS.P.A.WuchangPCGP`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `wuchangfallenfeathers-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `wuchangfallenfeathers-logicmods` | high | `{gamePath}/Project_Plague/Content/Paks/LogicMods` |
| Root Game Folder | `wuchangfallenfeathers-root` | high | `{gamePath}` |
| Content Folder | `wuchangfallenfeathers-contentfolder` | high | `{gamePath}/Project_Plague` |
| UE5 Paks (no "~mods") | `wuchangfallenfeathers-pakalt` | high | `{gamePath}/Project_Plague/Content/Paks` |
| UE5 Sortable Mod | `wuchangfallenfeathers-ue5-sortable-modtype` | 25 | `?` |
| UE4SS Script Mod | `wuchangfallenfeathers-scripts` | 50 | `?` |
| UE4SS DLL Mod | `wuchangfallenfeathers-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `wuchangfallenfeathers-binaries` | 54 | `?` |
| UE4SS | `wuchangfallenfeathers-ue4ss` | 56 | `?` |
| Mod Enabler | `wuchangfallenfeathers-sigbypass` | 58 | `?` |
| Config (LocalAppData) | `wuchangfallenfeathers-config` | 60 | `?` |
| Saves (LocalAppData) | `wuchangfallenfeathers-save` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `wuchangfallenfeathers-ue4sscombo` | 25 |
| `wuchangfallenfeathers-logicmods` | 27 |
| `wuchangfallenfeathers-ue4ss` | 31 |
| `wuchangfallenfeathers-sigbypass` | 32 |
| `wuchangfallenfeathers-scripts` | 33 |
| `wuchangfallenfeathers-ue4ssdll` | 35 |
| `wuchangfallenfeathers-root` | 37 |
| `wuchangfallenfeathers-contentfolder` | 39 |
| `wuchangfallenfeathers-config` | 41 |
| `wuchangfallenfeathers-save` | 43 |
| `wuchangfallenfeathers-binaries` | 45 |

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
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

