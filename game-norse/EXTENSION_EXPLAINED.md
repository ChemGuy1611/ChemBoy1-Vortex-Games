# NORSE: Oath of Blood — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | NORSE: Oath of Blood Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `norse` |
| Executable | `Norse.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Norse.exe` |
| Executable (Demo) | `Norse.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1700](https://www.nexusmods.com/site/mods/1700) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Norse:_Oath_of_Blood](https://www.pcgamingwiki.com/wiki/Norse:_Oath_of_Blood) |

## Supported Stores

- **Steam** — `3054690`
- **Epic Games Store** — `ee6e221431994d89b072a92189d66efc`
- **GOG** — `1225623266`

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
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_CONFIG` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_SAVE` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `norse-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `norse-logicmods` | high | `{gamePath}/Norse/Content/Paks` |
| Paks (no "~mods") | `norse-pakalt` | high | `{gamePath}/Norse/Content/Paks` |
| Root Game Folder | `norse-root` | high | `{gamePath}` |
| Root Sub-Folders | `norse-rootsubfolders` | high | `{gamePath}/Norse` |
| UE Sortable Pak Mod | `norse-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `norse-scripts` | 50 | `?` |
| UE4SS DLL Mod | `norse-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `norse-binaries` | 54 | `?` |
| UE4SS | `norse-ue4ss` | 56 | `?` |
| Config (Local AppData) | `norse-config` | 62 | `?` |
| Saves (Local AppData) | `norse-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `norse-ue4sscombo` | 26 |
| `norse-logicmods` | 27 |
| `norse-ue4ss` | 31 |
| `norse-scripts` | 35 |
| `norse-ue4ssdll` | 37 |
| `norse-root` | 39 |
| `norse-config` | 41 |
| `norse-save` | 43 |
| `norse-binaries` | 49 |

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
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

