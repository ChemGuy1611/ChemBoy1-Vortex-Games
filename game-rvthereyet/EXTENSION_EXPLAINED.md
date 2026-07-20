# RV There Yet? — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | RV There Yet? Vortex Extension |
| Engine / Structure | Unreal Engine 4-5 Game |
| Author | ChemBoy1 |

### Notes

- Rebuilt on the unified UE4-5 template and added Xbox Game Pass version support

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `rvthereyet` |
| Executable | `Ride.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Ride.exe` |
| Executable (Demo) | `Ride.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1509](https://www.nexusmods.com/site/mods/1509) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/RV_There_Yet%3F](https://www.pcgamingwiki.com/wiki/RV_There_Yet%3F) |

## Supported Stores

- **Steam** — `3949040`
- **Xbox / Microsoft Store** — `NuggetsEntertainmentAB.RVThereYet`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `true` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `hasServer` | `false` | toggle for server pak mod logic |
| `preferHardlinks` | `true` | set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `hasUserIdFolder` | `true` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `FBLO` | `true` | set to false to use legacy load order page |
| `ue4ssLoadOrder` | `true` | enable load order and mods.txt writing for UE4SS mods |
| `logicModsLoadOrder` | `true` | enable load order page and load_order.txt writing for LogicMods/Blueprint pak mods |
| `collectionsLoadOrder` | `true` | include UE4SS and LogicMods load orders in collections (ANDed with the toggles above) |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_CONFIG` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_SAVE` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `rvthereyet-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `rvthereyet-logicmods` | high | `{gamePath}/Ride/Content/Paks` |
| Paks (no "~mods") | `rvthereyet-pakalt` | high | `{gamePath}/Ride/Content/Paks` |
| Root Folder | `rvthereyet-root` | high | `{gamePath}` |
| UE Sortable Pak Mod | `rvthereyet-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `rvthereyet-scripts` | 50 | `?` |
| UE4SS DLL Mod | `rvthereyet-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `rvthereyet-binaries` | 54 | `?` |
| UE4SS | `rvthereyet-ue4ss` | 56 | `?` |
| Config (Local AppData) | `rvthereyet-config` | 62 | `?` |
| Saves (Local AppData) | `rvthereyet-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `rvthereyet-ue4sscombo` | 26 |
| `rvthereyet-logicmods` | 27 |
| `rvthereyet-uesortablepak` | 29 |
| `rvthereyet-ue4ss` | 31 |
| `rvthereyet-scripts` | 35 |
| `rvthereyet-ue4ssdll` | 37 |
| `rvthereyet-root` | 39 |
| `rvthereyet-config` | 41 |
| `rvthereyet-save` | 43 |
| `rvthereyet-binaries` | 49 |

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
- Open UE4SS mods.txt
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
- **UE4SS Load Order** — manages UE4SS script/DLL mod load order via a dedicated page; serializes order to `mods.txt` on deploy.
- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

