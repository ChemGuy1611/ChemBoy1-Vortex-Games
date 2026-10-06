# MechWarrior 5: Clans — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | MechWarrior 5: Clans Vortex Extension |
| Engine / Structure | Unreal Engine 4-5 Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `mechwarrior5clans` |
| Executable | `MechWarrior.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `MechWarrior.exe` |
| Executable (Demo) | `MechWarrior.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1074](https://www.nexusmods.com/site/mods/1074) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/MechWarrior_5%3A_Clans](https://www.pcgamingwiki.com/wiki/MechWarrior_5%3A_Clans) |

## Supported Stores

- **Steam** — `2000890`
- **Epic Games Store** — `d97001f0a24b46afa65b42b2ceb5f1bc`
- **Xbox / Microsoft Store** — `PiranhaGamesInc.MechWarrior5Clans`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasModKit` | `true` | toggle for UE ModKit mod support |
| `hasServer` | `false` | toggle for server pak mod logic |
| `preferHardlinks` | `true` | set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS (only applies when ue4ssLoadOrder is enabled) |
| `writeEngineVersion` | `false` | toggle to write ENGINE_VERSION into UE4SS-settings.ini (EngineVersionOverride) on deploy, when UE4SS is installed |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |
| `exeHasGameVersion` | `false` | toggle: true if the game devs stamp the real game version (not just the UE engine version) into the exe ProductVersion |
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
| UE4SS Script-LogicMod Combo | `mechwarrior5clans-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `mechwarrior5clans-logicmods` | high | `{gamePath}/MW5Clans/Content/Paks/LogicMods` |
| Paks (no "~mods") | `mechwarrior5clans-pakalt` | high | `{gamePath}/MW5Clans/Content/Paks` |
| Root Folder | `mechwarrior5clans-root` | high | `{gamePath}` |
| UE5 Paks | `mechwarrior5clans-ue5` | high | `{gamePath}/MW5Clans/Content/Paks/~mods` |
| Modding Editor Mod | `mechwarrior5clans-moddingeditormod` | high | `{gamePath}/MW5Clans/Mods` |
| UE Sortable Pak Mod | `mechwarrior5clans-ue5-sortable-modtype` | 25 | `?` |
| Legacy UE - REINSTALL TO SORT | `ue5-sortable-modtype` | 65 | `?` |
| UE4SS Script Mod | `mechwarrior5clans-scripts` | 50 | `?` |
| UE4SS DLL Mod | `mechwarrior5clans-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `mechwarrior5clans-binaries` | 54 | `?` |
| UE4SS | `mechwarrior5clans-ue4ss` | 56 | `?` |
| Config (Local AppData) | `mechwarrior5clans-config` | 62 | `?` |
| Saves (Local AppData) | `mechwarrior5clans-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `mechwarrior5clans-moddingeditormod` | 25 |
| `mechwarrior5clans-ue4sscombo` | 26 |
| `mechwarrior5clans-logicmods` | 27 |
| `mechwarrior5clans-ue5-sortable-modtype` | 29 |
| `mechwarrior5clans-ue4ss` | 31 |
| `mechwarrior5clans-scripts` | 35 |
| `mechwarrior5clans-ue4ssdll` | 37 |
| `mechwarrior5clans-root` | 39 |
| `mechwarrior5clans-config` | 41 |
| `mechwarrior5clans-save` | 43 |
| `mechwarrior5clans-binaries` | 49 |

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
- Open SteamDB Page
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
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
