# The Outer Worlds 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | The Outer Worlds 2 Vortex Extension |
| Engine / Structure | UE5 (Xbox-Integrated) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `theouterworlds2` |
| Executable | `TheOuterWorlds2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1498](https://www.nexusmods.com/site/mods/1498) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/The_Outer_Worlds_2](https://www.pcgamingwiki.com/wiki/The_Outer_Worlds_2) |

## Supported Stores

- **Steam** — `1449110`
- **Xbox / Microsoft Store** — `Microsoft.OE-Arkansas`

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
| UE4SS Script-LogicMod Combo | `theouterworlds2-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `theouterworlds2-logicmods` | high | `{gamePath}/Arkansas/Content/Paks/LogicMods` |
| Root Game Folder | `theouterworlds2-root` | high | `{gamePath}` |
| Content Folder | `theouterworlds2-contentfolder` | high | `{gamePath}/Arkansas` |
| UE5 Paks (no "~mods") | `theouterworlds2-pakalt` | high | `{gamePath}/Arkansas/Content/Paks` |
| UE5 Sortable Mod | `theouterworlds2-ue5-sortable-modtype` | 25 | `?` |
| UE4SS Script Mod | `theouterworlds2-scripts` | 50 | `?` |
| UE4SS DLL Mod | `theouterworlds2-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `theouterworlds2-binaries` | 54 | `?` |
| UE4SS | `theouterworlds2-ue4ss` | 56 | `?` |
| Config (LocalAppData) | `theouterworlds2-config` | 60 | `?` |
| Saves (LocalAppData) | `theouterworlds2-save` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `theouterworlds2-ue4sscombo` | 25 |
| `theouterworlds2-logicmods` | 27 |
| `theouterworlds2-ue4ss` | 31 |
| `theouterworlds2-scripts` | 33 |
| `theouterworlds2-ue4ssdll` | 35 |
| `theouterworlds2-root` | 37 |
| `theouterworlds2-contentfolder` | 39 |
| `theouterworlds2-config` | 41 |
| `theouterworlds2-save` | 43 |
| `theouterworlds2-binaries` | 49 |

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

