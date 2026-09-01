# The Blood of Dawnwalker — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | The Blood of Dawnwalker Vortex Extension |
| Engine / Structure | Unreal Engine 4-5 Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `thebloodofdawnwalker` |
| Executable | `XXX.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `XXX.exe` |
| Executable (Demo) | `XXX.exe` |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/The_Blood_of_Dawnwalker](https://www.pcgamingwiki.com/wiki/The_Blood_of_Dawnwalker) |

## Supported Stores

- **Steam** — `3751260`
- **GOG** — `1889754300`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `true` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `hasServer` | `false` | toggle for server pak mod logic |
| `preferHardlinks` | `true` | set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS (only applies when ue4ssLoadOrder is enabled) |
| `writeEngineVersion` | `false` | toggle to write ENGINE_VERSION into UE4SS-settings.ini (EngineVersionOverride) on deploy, when UE4SS is installed |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `FBLO` | `true` | set to false to use legacy load order page |
| `ue4ssLoadOrder` | `true` | master toggle for UE4SS support: UE4SS/Scripts/DLL/LogicMods mod types and installers, UE4SS buttons, load order page, and mods.txt writing |
| `logicModsLoadOrder` | `true` | enable load order page and load_order.txt writing for LogicMods/Blueprint pak mods |
| `collectionsLoadOrder` | `true` | include UE4SS and LogicMods load orders in collections (ANDed with the toggles above) |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_CONFIG` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_SAVE` | `false` | secondary same as above (if save and config are in different locations) |
| `mod_update_all_profile` | `false` | for mod update to keep them in the load order and not uncheck them |
| `updating_mod` | `false` | used to see if it's a mod update or not |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `thebloodofdawnwalker-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `thebloodofdawnwalker-logicmods` | high | `{gamePath}/XXX/Content/Paks` |
| Paks (no "~mods") | `thebloodofdawnwalker-pakalt` | high | `{gamePath}/XXX/Content/Paks` |
| Root Folder | `thebloodofdawnwalker-root` | high | `{gamePath}` |
| UE Sortable Pak Mod | `thebloodofdawnwalker-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `thebloodofdawnwalker-scripts` | 50 | `?` |
| UE4SS DLL Mod | `thebloodofdawnwalker-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `thebloodofdawnwalker-binaries` | 54 | `?` |
| UE4SS | `thebloodofdawnwalker-ue4ss` | 56 | `?` |
| Config (Local AppData) | `thebloodofdawnwalker-config` | 62 | `?` |
| Saves (Local AppData) | `thebloodofdawnwalker-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `thebloodofdawnwalker-ue4sscombo` | 26 |
| `thebloodofdawnwalker-logicmods` | 27 |
| `thebloodofdawnwalker-uesortablepak` | 29 |
| `thebloodofdawnwalker-ue4ss` | 31 |
| `thebloodofdawnwalker-scripts` | 35 |
| `thebloodofdawnwalker-ue4ssdll` | 37 |
| `thebloodofdawnwalker-root` | 39 |
| `thebloodofdawnwalker-config` | 41 |
| `thebloodofdawnwalker-save` | 43 |
| `thebloodofdawnwalker-binaries` | 49 |

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
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

