# The Lord of the Rings: Return to Moria — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | The Lord of the Rings: Return to Moria Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `thelordoftheringsreturntomoria` |
| Executable | `Moria.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Moria.exe` |
| Executable (Demo) | `Moria.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1635](https://www.nexusmods.com/site/mods/1635) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/The_Lord_of_the_Rings:_Return_to_Moria](https://www.pcgamingwiki.com/wiki/The_Lord_of_the_Rings:_Return_to_Moria) |

## Supported Stores

- **Steam** — `2933130`
- **Epic Games Store** — `8e4f8dc250364e30aef276555bba1734`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `preferHardlinks` | `true` | set true to perform partition check for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, also disable loadOrder. |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_CONFIG` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_SAVE` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `thelordoftheringsreturntomoria-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `thelordoftheringsreturntomoria-logicmods` | high | `{gamePath}/Moria/Content/Paks` |
| Paks (no "~mods") | `thelordoftheringsreturntomoria-pakalt` | high | `{gamePath}/Moria/Content/Paks` |
| Root Game Folder | `thelordoftheringsreturntomoria-root` | high | `{gamePath}` |
| Root Sub-Folders | `thelordoftheringsreturntomoria-rootsubfolders` | high | `{gamePath}/Moria` |
| UE Sortable Pak Mod | `thelordoftheringsreturntomoria-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `thelordoftheringsreturntomoria-scripts` | 50 | `?` |
| UE4SS DLL Mod | `thelordoftheringsreturntomoria-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `thelordoftheringsreturntomoria-binaries` | 54 | `?` |
| UE4SS | `thelordoftheringsreturntomoria-ue4ss` | 56 | `?` |
| Config (Local AppData) | `thelordoftheringsreturntomoria-config` | 62 | `?` |
| Saves (Local AppData) | `thelordoftheringsreturntomoria-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `thelordoftheringsreturntomoria-ue4sscombo` | 26 |
| `thelordoftheringsreturntomoria-logicmods` | 27 |
| `thelordoftheringsreturntomoria-ue4ss` | 31 |
| `thelordoftheringsreturntomoria-scripts` | 35 |
| `thelordoftheringsreturntomoria-ue4ssdll` | 37 |
| `thelordoftheringsreturntomoria-root` | 39 |
| `thelordoftheringsreturntomoria-config` | 41 |
| `thelordoftheringsreturntomoria-save` | 43 |
| `thelordoftheringsreturntomoria-binaries` | 49 |

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

- **Load Order** — mods are assigned numbered folder names or sorted based on their position in the load order.
- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

