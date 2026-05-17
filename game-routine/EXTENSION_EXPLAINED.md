# ROUTINE — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | ROUTINE Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `routine` |
| Executable | `Routine.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Routine.exe` |
| Executable (Demo) | `Routine.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1575](https://www.nexusmods.com/site/mods/1575) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Routine](https://www.pcgamingwiki.com/wiki/Routine) |

## Supported Stores

- **Steam** — `606160`
- **Xbox / Microsoft Store** — `RawFury.ROUTINE`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `true` | toggle for Xbox version logic (to unify templates) |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `routine-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `routine-logicmods` | high | `{gamePath}/Routine/Content/Paks` |
| Paks (no "~mods") | `routine-pakalt` | high | `{gamePath}/Routine/Content/Paks` |
| Root Game Folder | `routine-root` | high | `{gamePath}` |
| Root Sub-Folders | `routine-rootsubfolders` | high | `{gamePath}/Routine` |
| UE Sortable Pak Mod | `routine-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `routine-scripts` | 50 | `?` |
| UE4SS DLL Mod | `routine-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `routine-binaries` | 54 | `?` |
| UE4SS | `routine-ue4ss` | 56 | `?` |
| Config (Local AppData) | `routine-config` | 60 | `?` |
| Saves (Local AppData) | `routine-save` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `routine-ue4sscombo` | 25 |
| `routine-logicmods` | 27 |
| `routine-ue4ss` | 31 |
| `routine-scripts` | 35 |
| `routine-ue4ssdll` | 37 |
| `routine-root` | 39 |
| `routine-config` | 41 |
| `routine-save` | 43 |
| `routine-binaries` | 49 |

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

