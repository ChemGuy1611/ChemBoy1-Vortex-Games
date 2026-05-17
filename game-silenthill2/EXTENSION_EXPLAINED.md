# Silent Hill 2 (2024) — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Silent Hill 2 Remake Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `silenthill2` |
| Executable | `SHProto.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/963](https://www.nexusmods.com/site/mods/963) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Silent_Hill_2](https://www.pcgamingwiki.com/wiki/Silent_Hill_2) |

## Supported Stores

- **Steam** — `2124490`
- **Epic Games Store** — `c4dc308a1b69492aba4d47f7feaa1083`
- **GOG** — `2051029707`
- **Xbox / Microsoft Store** — `KonamiDigitalEntertainmen.SILENTHILL2`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Scripts | `silenthill2-scripts` | high | `{gamePath}/SHProto/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `silenthill2-ue4ssdll` | high | `{gamePath}/SHProto/Binaries/Win64/ue4ss/Mods` |
| UE4SS LogicMods (Blueprint) | `silenthill2-logicmods` | high | `{gamePath}/SHProto/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `silenthill2-ue4sscombo` | high | `{gamePath}` |
| Config (LocalAppData) | `silenthill2-config` | high | `LOCALAPPDATA/SilentHill2/Saved/Config/Windows` |
| Saves (LocalAppData) | `silenthill2-save` | high | `LOCALAPPDATA/SilentHill2/Saved/SaveGames/USERID_FOLDER/USERID_FOLDER` |
| Root Game Folder | `silenthill2-root` | high | `{gamePath}` |
| UE5 Paks | `silenthill2-ue5` | high | `{gamePath}/SHProto/Content/Paks/~mods` |
| UE5 Paks (no "~mods") | `silenthill2-pakalt` | high | `{gamePath}/SHProto/Content/Paks` |
| Binaries (Engine Injector) | `silenthill2-binaries` | high | `{gamePath}/SHProto/Binaries/Win64` |
| UE4SS | `silenthill2-ue4ss` | low | `{gamePath}/SHProto/Binaries/Win64` |
| UE5 Sortable Mod | `silenthill2-ue5-sortable-modtype` | 25 | `?` |
| Legacy UE - REINSTALL TO SORT | `ue5-sortable-modtype` | 65 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 35 |
| `silenthill2-ue4ss-logicscriptcombo` | 25 |
| `silenthill2-ue4ss-logicmod` | 30 |
| `silenthill2-ue4ss` | 40 |
| `silenthill2-ue4ss-scripts` | 45 |
| `silenthill2-ue4ssdll` | 47 |
| `silenthill2-root` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`SHProto.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS
- Open UE4SS Settings INI
- Open UE4SS mods.json
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
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

