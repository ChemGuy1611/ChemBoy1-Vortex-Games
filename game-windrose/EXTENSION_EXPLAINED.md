# Windrose — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Windrose Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

### Notes

- User selects where to install pak mods (SP or MP)
- Dedicated Server registered as a separate game
- Had to move pak modType paths up to EPIC_CODE_NAME as the game will try to load ANY JSON (deployment.json) files within the Content folder (never seen this before)

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `windrose` |
| Executable | `Windrose.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Windrose.exe` |
| Executable (Demo) | `Windrose.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1752](https://www.nexusmods.com/site/mods/1752) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Windrose](https://www.pcgamingwiki.com/wiki/Windrose) |

## Supported Stores

- **Steam** — `3041230`
- **Epic Games Store** — `d08157fbe22d45fcba452680857ac58d`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `setupNotification` | `true` | enable to show the user a notification with special instructions (specify below) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `hasServer` | `true` | toggle for server pak mod logic |
| `preferHardlinks` | `true` | set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `FBLO` | `true` | set to false to use legacy load order page |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_CONFIG` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_SAVE` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Server Pak Mod | `windrose-serverpaks` | high | `{gamePath}/R5/Builds/WindowsServer/R5` |
| UE4SS Script-LogicMod Combo | `windrose-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `windrose-logicmods` | high | `{gamePath}/R5` |
| Paks (no "~mods") | `windrose-pakalt` | high | `{gamePath}/R5/Content/Paks` |
| Root Game Folder | `windrose-root` | high | `{gamePath}` |
| Root Sub-Folders | `windrose-rootsubfolders` | high | `{gamePath}/R5` |
| Binaries (Engine Injector) | `windrose-binaries` | high | `{gamePath}/R5/Binaries/Win64` |
| UE4SS | `windrose-ue4ss` | low | `{gamePath}/R5/Binaries/Win64` |
| UE4SS Script Mod | `windrose-scripts` | low | `{gamePath}/R5/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `windrose-ue4ssdll` | low | `{gamePath}/R5/Binaries/Win64/ue4ss/Mods` |
| UE Sortable Pak Mod | `windrose-uesortablepak` | 25 | `?` |
| Config (Local AppData) | `windrose-config` | 62 | `?` |
| Saves (Local AppData) | `windrose-save` | 64 | `?` |
| UE Sortable Pak Mod | `windrose-server-uesortablepak` | 25 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `windrose-ue4sscombo` | 26 |
| `windrose-logicmods` | 27 |
| `windrose-uesortablepak` | 30 |
| `windrose-ue4ss` | 31 |
| `windrose-scripts` | 35 |
| `windrose-ue4ssdll` | 37 |
| `windrose-root` | 39 |
| `windrose-config` | 41 |
| `windrose-save` | 43 |
| `windrose-binaries` | 49 |
| `windrose-server-uesortablepak` | 29 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Client Paks Folder
- Open Server Paks Folder
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
- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
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
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

