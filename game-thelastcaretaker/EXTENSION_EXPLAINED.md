# The Last Caretaker — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | The Last Caretaker Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `thelastcaretaker` |
| Executable | `Voyage.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Voyage.exe` |
| Executable (Demo) | `Voyage.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1624](https://www.nexusmods.com/site/mods/1624) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/The_Last_Caretaker](https://www.pcgamingwiki.com/wiki/The_Last_Caretaker) |

## Supported Stores

- **Steam** — `1783560`
- **Epic Games Store** — `dfc65508c8124d5b86a5d4f7f8a0b2e4`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic (to unify templates) |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, also disable loadOrder. |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `thelastcaretaker-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `thelastcaretaker-logicmods` | high | `{gamePath}/Voyage/Content/Paks` |
| Paks (no "~mods") | `thelastcaretaker-pakalt` | high | `{gamePath}/Voyage/Content/Paks` |
| Root Game Folder | `thelastcaretaker-root` | high | `{gamePath}` |
| Root Sub-Folders | `thelastcaretaker-rootsubfolders` | high | `{gamePath}/Voyage` |
| UE Sortable Pak Mod | `thelastcaretaker-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `thelastcaretaker-scripts` | 50 | `?` |
| UE4SS DLL Mod | `thelastcaretaker-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `thelastcaretaker-binaries` | 54 | `?` |
| UE4SS | `thelastcaretaker-ue4ss` | 56 | `?` |
| Config (Local AppData) | `thelastcaretaker-config` | 62 | `?` |
| Saves (Local AppData) | `thelastcaretaker-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `thelastcaretaker-ue4sscombo` | 26 |
| `thelastcaretaker-logicmods` | 27 |
| `thelastcaretaker-ue4ss` | 31 |
| `thelastcaretaker-scripts` | 35 |
| `thelastcaretaker-ue4ssdll` | 37 |
| `thelastcaretaker-root` | 39 |
| `thelastcaretaker-config` | 41 |
| `thelastcaretaker-save` | 43 |
| `thelastcaretaker-binaries` | 49 |

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

