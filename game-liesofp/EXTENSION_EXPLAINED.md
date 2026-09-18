# Lies of P — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Lies of P Vortex Extension |
| Engine / Structure | Unreal Engine 4-5 Game |
| Author | ChemBoy1 |

### Notes

- Rebuilt on the unified UE4-5 template (base file: game-trepang2/index.js), added UE4SS/LogicMods/Save mod support
- Keeps Unreal Engine Mod Installer (UEMI) dependency for PAK installation - FBLO wired to UEMI's global 'ue4-sortable-modtype' via a loadOrderPrefixFunc wrapper
- Fixed a latent bug from the pre-FBLO 0.5.x extension: its Steam/Epic Config/Save paths joined a relative "Saved\Config\..." string onto the game's own install path instead of %LocalAppData%, pointing at a folder that doesn't exist (confirmed against real save/config location via web search). Now uses the template's standard LocalAppData path, matching Xbox (which was already correct).

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `liesofp` |
| Executable | `LOP.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `LOP.exe` |
| Executable (Demo) | `LOP.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/852](https://www.nexusmods.com/site/mods/852) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Lies_of_P](https://www.pcgamingwiki.com/wiki/Lies_of_P) |

## Supported Stores

- **Steam** — `1627720`
- **Epic Games Store** — `414c01a544a84928be40c1e86e0fd169`
- **Xbox / Microsoft Store** — `Neowiz.3616725F496B`

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
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
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
| UE4SS Script-LogicMod Combo | `liesofp-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `liesofp-logicmods` | high | `{gamePath}/LiesofP/Content/Paks` |
| Paks (no "~mods") | `liesofp-pakalt` | high | `{gamePath}/LiesofP/Content/Paks` |
| Root Folder | `liesofp-root` | high | `{gamePath}` |
| UE4SS Script Mod | `liesofp-scripts` | 50 | `?` |
| UE4SS DLL Mod | `liesofp-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `liesofp-binaries` | 54 | `?` |
| UE4SS | `liesofp-ue4ss` | 56 | `?` |
| Config (Local AppData) | `liesofp-config` | 62 | `?` |
| Saves (Local AppData) | `liesofp-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `liesofp-ue4sscombo` | 23 |
| `liesofp-logicmods` | 24 |
| `liesofp-ue4ss` | 31 |
| `liesofp-scripts` | 35 |
| `liesofp-ue4ssdll` | 37 |
| `liesofp-root` | 39 |
| `liesofp-config` | 41 |
| `liesofp-save` | 43 |
| `liesofp-binaries` | 49 |

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
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `Unreal Engine Mod Installer`.
