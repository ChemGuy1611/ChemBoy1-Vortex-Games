# MY HERO ACADEMIA: All's Justice — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | MY HERO ACADEMIA: All's Justice Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `myheroacademiaallsjustice` |
| Executable | `HeroGame/Binaries/Win64/AJGAME.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `HeroGame/Binaries/Win64/AJGAME.exe` |
| Executable (Demo) | `HeroGame/Binaries/Win64/AJGAME.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1687](https://www.nexusmods.com/site/mods/1687) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/My_Hero_Academia:_All%27s_Justice](https://www.pcgamingwiki.com/wiki/My_Hero_Academia:_All%27s_Justice) |

## Supported Stores

- **Steam** — `2362050`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `preferHardlinks` | `true` | set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS |
| `SIGBYPASS_REQUIRED` | `true` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_CONFIG` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_SAVE` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `myheroacademiaallsjustice-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `myheroacademiaallsjustice-logicmods` | high | `{gamePath}/HeroGame/Content/Paks` |
| Paks (no "~mods") | `myheroacademiaallsjustice-pakalt` | high | `{gamePath}/HeroGame/Content/Paks` |
| Root Game Folder | `myheroacademiaallsjustice-root` | high | `{gamePath}` |
| Root Sub-Folders | `myheroacademiaallsjustice-rootsubfolders` | high | `{gamePath}/HeroGame` |
| UE Sortable Pak Mod | `myheroacademiaallsjustice-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `myheroacademiaallsjustice-scripts` | 50 | `?` |
| UE4SS DLL Mod | `myheroacademiaallsjustice-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `myheroacademiaallsjustice-binaries` | 54 | `?` |
| UE4SS | `myheroacademiaallsjustice-ue4ss` | 56 | `?` |
| Sig Bypass | `myheroacademiaallsjustice-sigbypass` | 58 | `?` |
| Config (Local AppData) | `myheroacademiaallsjustice-config` | 62 | `?` |
| Saves (Local AppData) | `myheroacademiaallsjustice-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `myheroacademiaallsjustice-ue4sscombo` | 26 |
| `myheroacademiaallsjustice-logicmods` | 27 |
| `myheroacademiaallsjustice-ue4ss` | 31 |
| `myheroacademiaallsjustice-sigbypass` | 33 |
| `myheroacademiaallsjustice-scripts` | 35 |
| `myheroacademiaallsjustice-ue4ssdll` | 37 |
| `myheroacademiaallsjustice-root` | 39 |
| `myheroacademiaallsjustice-config` | 41 |
| `myheroacademiaallsjustice-save` | 43 |
| `myheroacademiaallsjustice-binaries` | 49 |

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

- **Load Order** — mods are assigned numbered folder names or sorted based on their position in the load order.
- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Signature Bypass** — .sig file bypass is required for pak mods.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

