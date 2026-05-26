# LEGO Batman: Legacy of the Dark Knight — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | LEGO Batman: Legacy of the Dark Knight Vortex Extension |
| Engine / Structure | Unreal Engine 4-5 Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `legobatmanlegacyofthedarkknight` |
| Executable | `LEGOBatmanLotDK.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `LEGOBatmanLotDK.exe` |
| Executable (Demo) | `LEGOBatmanLotDK.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1935](https://www.nexusmods.com/site/mods/1935) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Lego_Batman%3A_Legacy_of_the_Dark_Knight](https://www.pcgamingwiki.com/wiki/Lego_Batman%3A_Legacy_of_the_Dark_Knight) |

## Supported Stores

- **Steam** — `2215200`
- **Epic Games Store** — `b111ac9d19e147c2a4a7073c8e7623c8`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `hasServer` | `false` | toggle for server pak mod logic |
| `preferHardlinks` | `true` | set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `FBLO` | `true` | set to false to use legacy load order page |
| `ue4ssLoadOrder` | `true` | enable load order and mods.txt writing for UE4SS mods |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_CONFIG` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_SAVE` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `legobatmanlegacyofthedarkknight-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `legobatmanlegacyofthedarkknight-logicmods` | high | `{gamePath}/LEGOBatmanLotDK/Content/Paks` |
| Paks (no "~mods") | `legobatmanlegacyofthedarkknight-pakalt` | high | `{gamePath}/LEGOBatmanLotDK/Content/Paks` |
| Root Game Folder | `legobatmanlegacyofthedarkknight-root` | high | `{gamePath}` |
| UE Sortable Pak Mod | `legobatmanlegacyofthedarkknight-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `legobatmanlegacyofthedarkknight-scripts` | 50 | `?` |
| UE4SS DLL Mod | `legobatmanlegacyofthedarkknight-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `legobatmanlegacyofthedarkknight-binaries` | 54 | `?` |
| UE4SS | `legobatmanlegacyofthedarkknight-ue4ss` | 56 | `?` |
| Config (Local AppData) | `legobatmanlegacyofthedarkknight-config` | 62 | `?` |
| Saves (Local AppData) | `legobatmanlegacyofthedarkknight-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `legobatmanlegacyofthedarkknight-ue4sscombo` | 26 |
| `legobatmanlegacyofthedarkknight-logicmods` | 27 |
| `legobatmanlegacyofthedarkknight-uesortablepak` | 29 |
| `legobatmanlegacyofthedarkknight-ue4ss` | 31 |
| `legobatmanlegacyofthedarkknight-scripts` | 35 |
| `legobatmanlegacyofthedarkknight-ue4ssdll` | 37 |
| `legobatmanlegacyofthedarkknight-root` | 39 |
| `legobatmanlegacyofthedarkknight-config` | 41 |
| `legobatmanlegacyofthedarkknight-save` | 43 |
| `legobatmanlegacyofthedarkknight-binaries` | 49 |

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
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

