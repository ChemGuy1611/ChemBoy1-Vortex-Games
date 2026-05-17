# Of Ash and Steel — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Of Ash and Steel Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `ofashandsteel` |
| Executable | `ofAshAndSteelGame.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `ofAshAndSteelGame.exe` |
| Executable (Demo) | `ofAshAndSteelGame.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1606](https://www.nexusmods.com/site/mods/1606) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Of_Ash_and_Steel](https://www.pcgamingwiki.com/wiki/Of_Ash_and_Steel) |

## Supported Stores

- **Steam** — `2893820`
- **GOG** — `1113561740`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic (to unify templates) |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `ofashandsteel-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `ofashandsteel-logicmods` | high | `{gamePath}/ofAshAndSteelGame/Content/Paks` |
| Paks (with "~mods") | `ofashandsteel-pakalt` | high | `{gamePath}/ofAshAndSteelGame/Content/Paks/~mods` |
| Root Game Folder | `ofashandsteel-root` | high | `{gamePath}` |
| Root Sub-Folders | `ofashandsteel-rootsubfolders` | high | `{gamePath}/ofAshAndSteelGame` |
| UE Sortable Pak Mod | `ofashandsteel-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `ofashandsteel-scripts` | 50 | `?` |
| UE4SS DLL Mod | `ofashandsteel-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `ofashandsteel-binaries` | 54 | `?` |
| UE4SS | `ofashandsteel-ue4ss` | 56 | `?` |
| Config (Local AppData) | `ofashandsteel-config` | 62 | `?` |
| Saves (Local AppData) | `ofashandsteel-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `ofashandsteel-ue4sscombo` | 26 |
| `ofashandsteel-logicmods` | 27 |
| `ofashandsteel-ue4ss` | 31 |
| `ofashandsteel-scripts` | 35 |
| `ofashandsteel-ue4ssdll` | 37 |
| `ofashandsteel-root` | 39 |
| `ofashandsteel-config` | 41 |
| `ofashandsteel-save` | 43 |
| `ofashandsteel-binaries` | 49 |

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
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

