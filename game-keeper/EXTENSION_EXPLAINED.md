# Keeper — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Keeper Vortex Extension |
| Engine / Structure | Unreal Engine 4-5 Game |
| Author | ChemBoy1 |

### Notes

- The project folder differs per store: Steam and GOG use Keeper\ (Keeper\Content, Keeper\Binaries\Win64), the Microsoft Store (Xbox) build uses PaganIdol\ (PaganIdol\Content, PaganIdol\Binaries\WinGDK). EPIC_CODE_NAME is the Steam/GOG folder and XBOX_CODE_NAME the Xbox one. The template assumes one folder, so setProjectFolder() (every site marked KEEPER ONLY) swaps each project-relative path to the active store's folder from getExecutable() and setup().
- The game is Unreal Engine 5.5.4. No Keeper mod has used UE4SS yet; other UE 5.5 games needed a hand-made ue4ss\UE4SS_Signatures\*.lua next to stock UE4SS, which the Download UE4SS button does not provide, so UE4SS may not start until a signature file is added.
- Unverified (no install was available and PCGamingWiki's Windows config and save rows are empty): the Steam/GOG Config folder name (Windows assumed), the Steam/GOG Save layout (flat SaveGames assumed), and the whole GOG build (assumed identical to Steam). Xbox Config (%LOCALAPPDATA%\Keeper\Saved\Config\WinGDK) and Save (Packages\Microsoft.PaganIdol_8wekyb3d8bbwe\SystemAppData\wgs) come from PCGamingWiki and files on disk. The data folder is Keeper, not PaganIdol, on every store.

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `keeper` |
| Executable | `Keeper.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Keeper.exe` |
| Executable (Demo) | `Keeper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1504](https://www.nexusmods.com/site/mods/1504) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Keeper](https://www.pcgamingwiki.com/wiki/Keeper) |

## Supported Stores

- **Steam** — `3043580`
- **GOG** — `1428536898`
- **Xbox / Microsoft Store** — `Microsoft.PaganIdol`

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
| UE4SS Script-LogicMod Combo | `keeper-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `keeper-logicmods` | high | `{gamePath}/Keeper/Content/Paks/LogicMods` |
| Paks (no "~mods") | `keeper-pakalt` | high | `{gamePath}/Keeper/Content/Paks` |
| Root Folder | `keeper-root` | high | `{gamePath}` |
| UE Sortable Pak Mod | `keeper-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `keeper-scripts` | 50 | `?` |
| UE4SS DLL Mod | `keeper-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `keeper-binaries` | 54 | `?` |
| UE4SS | `keeper-ue4ss` | 56 | `?` |
| Config (Local AppData) | `keeper-config` | 62 | `?` |
| Saves (Local AppData) | `keeper-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `keeper-ue4sscombo` | 26 |
| `keeper-logicmods` | 27 |
| `keeper-uesortablepak` | 29 |
| `keeper-ue4ss` | 31 |
| `keeper-scripts` | 35 |
| `keeper-ue4ssdll` | 37 |
| `keeper-root` | 39 |
| `keeper-config` | 41 |
| `keeper-save` | 43 |
| `keeper-binaries` | 49 |

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
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
