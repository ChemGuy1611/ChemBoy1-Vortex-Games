# Manor Lords — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Manor Lords Vortex Extension |
| Engine / Structure | UE4 (XBOX Integrated) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `manorlords` |
| Executable | `ManorLords.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/868](https://www.nexusmods.com/site/mods/868) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Manor_Lords](https://www.pcgamingwiki.com/wiki/Manor_Lords) |

## Supported Stores

- **Steam** — `1363080`
- **Epic Games Store** — `8a5e1dedaa0e4f4e8b2ac2c00e849111`
- **GOG** — `1361243432`
- **Xbox / Microsoft Store** — `HoodedHorse.ManorLords`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS LogicMods (Blueprint) | `manorlords-logicmods` | high | `{gamePath}/ManorLords/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `manorlords-ue4sscombo` | high | `{gamePath}` |
| Root Game Folder | `manorlords-root` | high | `{gamePath}` |
| Paks | `manorlords-pak` | high | `{gamePath}/ManorLords/Content/Paks/~mods` |
| MLUE4SS Mod | `manorlords-mlue4ss` | high | `{gamePath}/.` |
| UE4SS Scripts | `manorlords-scripts` | 40 | `?` |
| UE4SS DLL Mod | `manorlords-ue4ssdll` | 42 | `?` |
| Config (LocalAppData) | `manorlords-config` | 45 | `?` |
| Saves (LocalAppData) | `manorlords-save` | 50 | `?` |
| Binaries (Engine Injector) | `manorlords-binaries` | 65 | `?` |
| UE4SS | `manorlords-ue4ss` | 70 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `manorlords-mlue4ss` | 20 |
| `manorlords-ue4ss-logicscriptcombo` | 21 |
| `manorlords-ue4ss-logicmod` | 23 |
| `manorlords-ue4ss` | 30 |
| `manorlords-ue4ss-scripts` | 35 |
| `manorlords-ue4ssdll` | 37 |
| `manorlords-root` | 40 |
| `manorlords-config` | 45 |
| `manorlords-save` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`ManorLords.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open UE4SS Settings INI
- Open UE4SS mods.json
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `ManorLords/Saved/Config/WindowsNoEditor` |
| Save | `ManorLords/Saved/SaveGames` |
| Save (Xbox) | `ManorLords/Saved/SaveGames` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `Unreal Engine Mod Installer`.

