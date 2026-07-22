# Trepang2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Trepang2 Vortex Extension |
| Engine / Structure | Unreal Engine 4-5 Game |
| Author | ChemBoy1 |

### Notes

- Rebuilt on the unified UE4-5 template, added Xbox Game Pass version support
- Keeps Unreal Engine Mod Installer (UEMI) dependency for PAK installation - FBLO wired to UEMI's global 'ue4-sortable-modtype' via a loadOrderPrefixFunc wrapper (see readyornot extension for reference wiring)

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `trepang2` |
| Executable | `CPPFPS.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `CPPFPS.exe` |
| Executable (Demo) | `CPPFPS.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/981](https://www.nexusmods.com/site/mods/981) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Trepang2](https://www.pcgamingwiki.com/wiki/Trepang2) |

## Supported Stores

- **Steam** — `1164940`
- **Epic Games Store** — `8d92750c06a2475b8361ae1e759bdef2`
- **GOG** — `1599916752`
- **Xbox / Microsoft Store** — `Team17DigitalLimited.Trepang2`

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
| `writeEngineVersion` | `false` | toggle to write ENGINE_VERSION into UE4SS-settings.ini (EngineVersionOverride) on deploy, when UE4SS is installed |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
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
| UE4SS Script-LogicMod Combo | `trepang2-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `trepang2-logicmods` | high | `{gamePath}/CPPFPS/Content/Paks` |
| Paks (no "~mods") | `trepang2-pakalt` | high | `{gamePath}/CPPFPS/Content/Paks` |
| Root Folder | `trepang2-root` | high | `{gamePath}` |
| UE4SS Script Mod | `trepang2-scripts` | 50 | `?` |
| UE4SS DLL Mod | `trepang2-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `trepang2-binaries` | 54 | `?` |
| UE4SS | `trepang2-ue4ss` | 56 | `?` |
| Config (Local AppData) | `trepang2-config` | 62 | `?` |
| Saves (Local AppData) | `trepang2-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `trepang2-ue4sscombo` | 23 |
| `trepang2-logicmods` | 24 |
| `trepang2-ue4ss` | 31 |
| `trepang2-scripts` | 35 |
| `trepang2-ue4ssdll` | 37 |
| `trepang2-root` | 39 |
| `trepang2-config` | 41 |
| `trepang2-save` | 43 |
| `trepang2-binaries` | 49 |

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
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `Unreal Engine Mod Installer`.

