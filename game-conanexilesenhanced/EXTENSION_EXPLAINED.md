# Conan Exiles Enhanced — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Conan Exiles Enhanced Vortex Extension |
| Engine / Structure | Unreal Engine 4-5 Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `conanexilesenhanced` |
| Executable | `ConanSandbox.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `ConanSandbox.exe` |
| Executable (Demo) | `ConanSandbox.exe` |
| Extension Page | [XXX](XXX) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Conan_Exiles](https://www.pcgamingwiki.com/wiki/Conan_Exiles) |

## Supported Stores

- **Steam** — `440900`
- **Epic Games Store** — `8efabb9c553b4a43a7ec95d452307429`

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
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `FBLO` | `true` | set to false to use legacy load order page |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_CONFIG` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_SAVE` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `conanexilesenhanced-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `conanexilesenhanced-logicmods` | high | `{gamePath}/ConanSandbox/Content/Paks` |
| Paks (no "~mods") | `conanexilesenhanced-pakalt` | high | `{gamePath}/ConanSandbox/Content/Paks` |
| Root Game Folder | `conanexilesenhanced-root` | high | `{gamePath}` |
| UE Sortable Pak Mod | `conanexilesenhanced-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `conanexilesenhanced-scripts` | 50 | `?` |
| UE4SS DLL Mod | `conanexilesenhanced-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `conanexilesenhanced-binaries` | 54 | `?` |
| UE4SS | `conanexilesenhanced-ue4ss` | 56 | `?` |
| Config (Local AppData) | `conanexilesenhanced-config` | 62 | `?` |
| Saves (Local AppData) | `conanexilesenhanced-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `conanexilesenhanced-ue4sscombo` | 26 |
| `conanexilesenhanced-logicmods` | 27 |
| `conanexilesenhanced-uesortablepak` | 29 |
| `conanexilesenhanced-ue4ss` | 31 |
| `conanexilesenhanced-scripts` | 35 |
| `conanexilesenhanced-ue4ssdll` | 37 |
| `conanexilesenhanced-root` | 39 |
| `conanexilesenhanced-config` | 41 |
| `conanexilesenhanced-save` | 43 |
| `conanexilesenhanced-binaries` | 49 |

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
- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

