# Retro Rewind - Video Store Simulator — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Retro Rewind - Video Store Simulator Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `retrorewindvideostoresimulator` |
| Executable | `RetroRewind.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `RetroRewind.exe` |
| Executable (Demo) | `RetroRewind.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1780](https://www.nexusmods.com/site/mods/1780) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Retro_Rewind](https://www.pcgamingwiki.com/wiki/Retro_Rewind) |

## Supported Stores

- **Steam** — `3552140`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `preferHardlinks` | `true` | set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
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
| UE4SS Script-LogicMod Combo | `retrorewindvideostoresimulator-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `retrorewindvideostoresimulator-logicmods` | high | `{gamePath}/RetroRewind/Content/Paks` |
| Paks (no "~mods") | `retrorewindvideostoresimulator-pakalt` | high | `{gamePath}/RetroRewind/Content/Paks` |
| Root Game Folder | `retrorewindvideostoresimulator-root` | high | `{gamePath}` |
| Root Sub-Folders | `retrorewindvideostoresimulator-rootsubfolders` | high | `{gamePath}/RetroRewind` |
| UE Sortable Pak Mod | `retrorewindvideostoresimulator-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `retrorewindvideostoresimulator-scripts` | 50 | `?` |
| UE4SS DLL Mod | `retrorewindvideostoresimulator-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `retrorewindvideostoresimulator-binaries` | 54 | `?` |
| UE4SS | `retrorewindvideostoresimulator-ue4ss` | 56 | `?` |
| Config (Local AppData) | `retrorewindvideostoresimulator-config` | 62 | `?` |
| Saves (Local AppData) | `retrorewindvideostoresimulator-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `retrorewindvideostoresimulator-ue4sscombo` | 26 |
| `retrorewindvideostoresimulator-logicmods` | 27 |
| `retrorewindvideostoresimulator-uesortablepak` | 29 |
| `retrorewindvideostoresimulator-ue4ss` | 31 |
| `retrorewindvideostoresimulator-scripts` | 35 |
| `retrorewindvideostoresimulator-ue4ssdll` | 37 |
| `retrorewindvideostoresimulator-root` | 39 |
| `retrorewindvideostoresimulator-config` | 41 |
| `retrorewindvideostoresimulator-save` | 43 |
| `retrorewindvideostoresimulator-binaries` | 49 |

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
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

