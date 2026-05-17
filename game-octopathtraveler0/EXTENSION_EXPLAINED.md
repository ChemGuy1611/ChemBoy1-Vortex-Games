# OCTOPATH TRAVELER 0 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | OCTOPATH TRAVELER 0 Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `octopathtraveler0` |
| Executable | `Octopath_Traveler0.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Octopath_Traveler0.exe` |
| Executable (Demo) | `Octopath_Traveler0.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1566](https://www.nexusmods.com/site/mods/1566) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Octopath_Traveler_0](https://www.pcgamingwiki.com/wiki/Octopath_Traveler_0) |

## Supported Stores

- **Steam** — `3014320`
- **Xbox / Microsoft Store** — `39EA002F.Octr0`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `true` | toggle for Xbox version logic (to unify templates) |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `octopathtraveler0-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `octopathtraveler0-logicmods` | high | `{gamePath}/Octopath_Traveler0/Content/Paks` |
| Paks (no "~mods") | `octopathtraveler0-pakalt` | high | `{gamePath}/Octopath_Traveler0/Content/Paks` |
| Root Game Folder | `octopathtraveler0-root` | high | `{gamePath}` |
| Root Sub-Folders | `octopathtraveler0-rootsubfolders` | high | `{gamePath}/Octopath_Traveler0` |
| UE Sortable Pak Mod | `octopathtraveler0-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `octopathtraveler0-scripts` | 50 | `?` |
| UE4SS DLL Mod | `octopathtraveler0-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `octopathtraveler0-binaries` | 54 | `?` |
| UE4SS | `octopathtraveler0-ue4ss` | 56 | `?` |
| Config (Local AppData) | `octopathtraveler0-config` | 60 | `?` |
| Saves (Local AppData) | `octopathtraveler0-save` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `octopathtraveler0-ue4sscombo` | 25 |
| `octopathtraveler0-logicmods` | 27 |
| `octopathtraveler0-ue4ss` | 31 |
| `octopathtraveler0-scripts` | 35 |
| `octopathtraveler0-ue4ssdll` | 37 |
| `octopathtraveler0-root` | 39 |
| `octopathtraveler0-config` | 41 |
| `octopathtraveler0-save` | 43 |
| `octopathtraveler0-binaries` | 49 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
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

