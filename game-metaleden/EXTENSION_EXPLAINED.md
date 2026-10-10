# METAL EDEN — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | METAL EDEN Vortex Extension |
| Engine / Structure | Unreal Engine 4-5 Game |
| Author | ChemBoy1 |

### Notes

- The game is Unreal Engine 5.3.1 with signed IO Store containers, so the Sig Bypass is required. Steam, GOG and the Steam demo are supported; there is no Epic or Xbox build.
- Saves live in %LOCALAPPDATA%\MetalEden\Saved\SaveGames\<user id>\FileSave, so the Save folder is the user id folder plus FileSave. A user with several user id folders gets the first one alphabetically.
- No install was available when this was ported: the GOG and demo executables (assumed to match Steam) and UE4SS booting on UE 5.3.1 are unverified.

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `metaleden` |
| Executable | `MetalEden.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `MetalEden.exe` |
| Executable (Demo) | `MetalEden.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1425](https://www.nexusmods.com/site/mods/1425) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Metal_Eden](https://www.pcgamingwiki.com/wiki/Metal_Eden) |

## Supported Stores

- **Steam** — `990380`
- **GOG** — `1253025084`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `hasServer` | `false` | toggle for server pak mod logic |
| `preferHardlinks` | `true` | set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS (only applies when ue4ssLoadOrder is enabled) |
| `writeEngineVersion` | `false` | toggle to write ENGINE_VERSION into UE4SS-settings.ini (EngineVersionOverride) on deploy, when UE4SS is installed |
| `SIGBYPASS_REQUIRED` | `true` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `hasUserIdFolder` | `true` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
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
| UE4SS Script-LogicMod Combo | `metaleden-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `metaleden-logicmods` | high | `{gamePath}/MetalEden/Content/Paks/LogicMods` |
| Paks (no "~mods") | `metaleden-pak` | high | `{gamePath}/MetalEden/Content/Paks` |
| Root Folder | `metaleden-root` | high | `{gamePath}` |
| Content Folder | `metaleden-contentfolder` | high | `{gamePath}/MetalEden` |
| UE Sortable Pak Mod | `metaleden-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `metaleden-scripts` | 50 | `?` |
| UE4SS DLL Mod | `metaleden-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `metaleden-binaries` | 54 | `?` |
| UE4SS | `metaleden-ue4ss` | 56 | `?` |
| Sig Bypass | `metaleden-sigbypass` | 58 | `?` |
| Config (Local AppData) | `metaleden-config` | 62 | `?` |
| Saves (Local AppData) | `metaleden-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `metaleden-ue4sscombo` | 26 |
| `metaleden-logicmods` | 27 |
| `metaleden-uesortablepak` | 29 |
| `metaleden-ue4ss` | 31 |
| `metaleden-sigbypass` | 33 |
| `metaleden-scripts` | 35 |
| `metaleden-ue4ssdll` | 37 |
| `metaleden-contentfolder` | 38 |
| `metaleden-root` | 39 |
| `metaleden-config` | 41 |
| `metaleden-save` | 43 |
| `metaleden-binaries` | 49 |

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
- Open Nexus Mods Page
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
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Signature Bypass** — .sig file bypass is required for pak mods.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
