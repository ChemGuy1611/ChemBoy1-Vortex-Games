# Clair Obscur: Expedition 33 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Clair Obscur: Expedition 33 Vortex Extension |
| Engine / Structure | UE5 (Xbox-Integrated) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `clairobscurexpedition33` |
| Executable | `Expedition33_Steam.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `SandFallGOG.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1279](https://www.nexusmods.com/site/mods/1279) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Clair_Obscur:_Expedition_33](https://www.pcgamingwiki.com/wiki/Clair_Obscur:_Expedition_33) |

## Supported Stores

- **Steam** — `1903340`
- **Epic Games Store** — `f18fc860e6b4419e89147983bf769723`
- **GOG** — `2125022825`
- **Xbox / Microsoft Store** — `KeplerInteractive.Expedition33`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `clairobscurexpedition33-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `clairobscurexpedition33-logicmods` | high | `{gamePath}/Sandfall/Content/Paks/LogicMods` |
| Root Game Folder | `clairobscurexpedition33-root` | high | `{gamePath}` |
| Content Folder | `clairobscurexpedition33-contentfolder` | high | `{gamePath}/Sandfall` |
| UE5 Paks (no "~mods") | `clairobscurexpedition33-pakalt` | high | `{gamePath}/Sandfall/Content/Paks` |
| UE5 Sortable Mod | `clairobscurexpedition33-ue5-sortable-modtype` | 25 | `?` |
| UE4SS Script Mod | `clairobscurexpedition33-scripts` | 50 | `?` |
| UE4SS DLL Mod | `clairobscurexpedition33-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `clairobscurexpedition33-binaries` | 54 | `?` |
| UE4SS | `clairobscurexpedition33-ue4ss` | 56 | `?` |
| Config (LocalAppData) | `clairobscurexpedition33-config` | 58 | `?` |
| Saves (LocalAppData) | `clairobscurexpedition33-save` | 60 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `clairobscurexpedition33-ue4sscombo` | 25 |
| `clairobscurexpedition33-logicmods` | 27 |
| `clairobscurexpedition33-ue4ss` | 31 |
| `clairobscurexpedition33-scripts` | 33 |
| `clairobscurexpedition33-ue4ssdll` | 35 |
| `clairobscurexpedition33-root` | 37 |
| `clairobscurexpedition33-contentfolder` | 39 |
| `clairobscurexpedition33-config` | 41 |
| `clairobscurexpedition33-save` | 43 |
| `clairobscurexpedition33-binaries` | 45 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
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
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

