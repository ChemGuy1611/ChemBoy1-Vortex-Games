# Dispatch — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Dispatch Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `dispatch` |
| Executable | `Dispatch.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Dispatch.exe` |
| Executable (Demo) | `Dispatch.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1552](https://www.nexusmods.com/site/mods/1552) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Dispatch_(2025)](https://www.pcgamingwiki.com/wiki/Dispatch_(2025)) |

## Supported Stores

- **Steam** — `2592160`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic (to unify templates) |
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
| UE4SS Script-LogicMod Combo | `dispatch-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `dispatch-logicmods` | high | `{gamePath}/Dispatch/Content/Paks` |
| Paks (no "~mods") | `dispatch-pakalt` | high | `{gamePath}/Dispatch/Content/Paks` |
| Root Game Folder | `dispatch-root` | high | `{gamePath}` |
| Root Sub-Folders | `dispatch-rootsubfolders` | high | `{gamePath}/Dispatch` |
| UE Sortable Pak Mod | `dispatch-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `dispatch-scripts` | 50 | `?` |
| UE4SS DLL Mod | `dispatch-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `dispatch-binaries` | 54 | `?` |
| UE4SS | `dispatch-ue4ss` | 56 | `?` |
| Config (Local AppData) | `dispatch-config` | 60 | `?` |
| Saves (Local AppData) | `dispatch-save` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `dispatch-ue4sscombo` | 25 |
| `dispatch-logicmods` | 27 |
| `dispatch-ue4ss` | 31 |
| `dispatch-scripts` | 35 |
| `dispatch-ue4ssdll` | 37 |
| `dispatch-root` | 39 |
| `dispatch-config` | 41 |
| `dispatch-save` | 43 |
| `dispatch-binaries` | 49 |

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
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

