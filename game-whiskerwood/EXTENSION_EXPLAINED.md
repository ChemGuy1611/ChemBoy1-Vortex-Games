# Whiskerwood — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Whiskerwood Vortex Extension |
| Engine / Structure | Unreal Engine Game (Unified) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `whiskerwood` |
| Executable | `Whiskerwood.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Whiskerwood.exe` |
| Executable (Demo) | `Whiskerwood.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1534](https://www.nexusmods.com/site/mods/1534) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Whiskerwood](https://www.pcgamingwiki.com/wiki/Whiskerwood) |

## Supported Stores

- **Steam** — `2489330`
- **Epic Games Store** — `55ddada911724046adcf29eb5a706b2e`
- **GOG** — `1924240273`
- **Xbox / Microsoft Store** — `HoodedHorse.WhiskerwoodNew`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `true` | toggle for Xbox version logic (to unify templates) |
| `multiExe` | `false` | toggle for multiple executables (to unify templates) |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `whiskerwood-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `whiskerwood-logicmods` | high | `{gamePath}/Whiskerwood/Content/Paks/LogicMods` |
| Paks (no "~mods") | `whiskerwood-pakalt` | high | `{gamePath}/Whiskerwood/Content/Paks` |
| Root Game Folder | `whiskerwood-root` | high | `{gamePath}` |
| Root Sub-Folders | `whiskerwood-rootsubfolders` | high | `{gamePath}/Whiskerwood` |
| UE Sortable Pak Mod | `whiskerwood-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `whiskerwood-scripts` | 50 | `?` |
| UE4SS DLL Mod | `whiskerwood-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `whiskerwood-binaries` | 54 | `?` |
| UE4SS | `whiskerwood-ue4ss` | 56 | `?` |
| Config (Local AppData) | `whiskerwood-config` | 60 | `?` |
| Saves (Local AppData) | `whiskerwood-save` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `whiskerwood-ue4sscombo` | 25 |
| `whiskerwood-logicmods` | 27 |
| `whiskerwood-ue4ss` | 31 |
| `whiskerwood-scripts` | 33 |
| `whiskerwood-ue4ssdll` | 35 |
| `whiskerwood-root` | 37 |
| `whiskerwood-config` | 39 |
| `whiskerwood-save` | 41 |
| `whiskerwood-binaries` | 49 |

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

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

