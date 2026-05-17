# Atomic Heart — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Atomic Heart Vortex Extension |
| Engine / Structure | Unreal Engine 4-5 Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `atomicheart` |
| Executable | `AtomicHeart.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `AtomicHeart.exe` |
| Executable (Demo) | `AtomicHeart.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1832](https://www.nexusmods.com/site/mods/1832) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Atomic_Heart](https://www.pcgamingwiki.com/wiki/Atomic_Heart) |

## Supported Stores

- **Steam** — `668580`
- **Xbox / Microsoft Store** — `FocusHomeInteractiveSA.579645D26CFD`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `true` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `preferHardlinks` | `true` | set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `FBLO` | `true` | set to false to use legacy load order page |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_CONFIG` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_SAVE` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `atomicheart-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `atomicheart-logicmods` | high | `{gamePath}/AtomicHeart/Content/Paks` |
| Paks (no "~mods") | `atomicheart-pakalt` | high | `{gamePath}/AtomicHeart/Content/Paks` |
| Root Game Folder | `atomicheart-root` | high | `{gamePath}` |
| Root Sub-Folders | `atomicheart-rootsubfolders` | high | `{gamePath}/AtomicHeart` |
| UE Sortable Pak Mod | `atomicheart-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `atomicheart-scripts` | 50 | `?` |
| UE4SS DLL Mod | `atomicheart-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `atomicheart-binaries` | 54 | `?` |
| UE4SS | `atomicheart-ue4ss` | 56 | `?` |
| Config (Local AppData) | `atomicheart-config` | 62 | `?` |
| Saves (Local AppData) | `atomicheart-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `atomicheart-ue4sscombo` | 26 |
| `atomicheart-logicmods` | 27 |
| `atomicheart-uesortablepak` | 29 |
| `atomicheart-ue4ss` | 31 |
| `atomicheart-scripts` | 35 |
| `atomicheart-ue4ssdll` | 37 |
| `atomicheart-root` | 39 |
| `atomicheart-config` | 41 |
| `atomicheart-save` | 43 |
| `atomicheart-binaries` | 49 |

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
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

