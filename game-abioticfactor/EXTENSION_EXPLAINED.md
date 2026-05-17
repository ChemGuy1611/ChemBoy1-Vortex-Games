# Abiotic Factor — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Abiotic Factor Vortex Extension |
| Engine / Structure | UE5 (Xbox-Integrated) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `abioticfactor` |
| Executable | `AbioticFactor.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1392](https://www.nexusmods.com/site/mods/1392) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Abiotic_Factor](https://www.pcgamingwiki.com/wiki/Abiotic_Factor) |

## Supported Stores

- **Steam** — `427410`
- **Xbox / Microsoft Store** — `PlayStack.AbioticFactor`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `abioticfactor-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `abioticfactor-logicmods` | high | `{gamePath}/AbioticFactor/Content/Paks/LogicMods` |
| Root Game Folder | `abioticfactor-root` | high | `{gamePath}` |
| Content Folder | `abioticfactor-contentfolder` | high | `{gamePath}/AbioticFactor` |
| UE5 Paks (no "~mods") | `abioticfactor-pakalt` | high | `{gamePath}/AbioticFactor/Content/Paks` |
| UE5 Sortable Mod | `abioticfactor-ue5-sortable-modtype` | 25 | `?` |
| UE4SS Script Mod | `abioticfactor-scripts` | 50 | `?` |
| UE4SS DLL Mod | `abioticfactor-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `abioticfactor-binaries` | 54 | `?` |
| UE4SS | `abioticfactor-ue4ss` | 56 | `?` |
| Config (LocalAppData) | `abioticfactor-config` | 60 | `?` |
| Saves (LocalAppData) | `abioticfactor-save` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `abioticfactor-ue4sscombo` | 25 |
| `abioticfactor-logicmods` | 27 |
| `abioticfactor-ue4ss` | 31 |
| `abioticfactor-scripts` | 33 |
| `abioticfactor-ue4ssdll` | 35 |
| `abioticfactor-root` | 37 |
| `abioticfactor-contentfolder` | 39 |
| `abioticfactor-config` | 41 |
| `abioticfactor-save` | 43 |
| `abioticfactor-binaries` | 45 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS
- Open UE4SS Settings INI
- Open UE4SS mods.txt
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

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

