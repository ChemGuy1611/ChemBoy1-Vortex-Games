# FANTASY LIFE i: The Girl Who Steals Time — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | FANTASY LIFE i: The Girl Who Steals Time Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `fantasylifeithegirlwhostealstime` |
| Executable | `NFL1.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `NFL1.exe` |
| Executable (Demo) | `NFL1.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1785](https://www.nexusmods.com/site/mods/1785) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Fantasy_Life_i%3A_The_Girl_Who_Steals_Time](https://www.pcgamingwiki.com/wiki/Fantasy_Life_i%3A_The_Girl_Who_Steals_Time) |

## Supported Stores

- **Steam** — `2993780`

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
| UE4SS Script-LogicMod Combo | `fantasylifeithegirlwhostealstime-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `fantasylifeithegirlwhostealstime-logicmods` | high | `{gamePath}/Game/Content/Paks` |
| Paks (no "~mods") | `fantasylifeithegirlwhostealstime-pakalt` | high | `{gamePath}/Game/Content/Paks` |
| Root Game Folder | `fantasylifeithegirlwhostealstime-root` | high | `{gamePath}` |
| Root Sub-Folders | `fantasylifeithegirlwhostealstime-rootsubfolders` | high | `{gamePath}/Game` |
| UE Sortable Pak Mod | `fantasylifeithegirlwhostealstime-uesortablepak` | 25 | `?` |
| Binaries (Engine Injector) | `fantasylifeithegirlwhostealstime-binaries` | 54 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `fantasylifeithegirlwhostealstime-uesortablepak` | 29 |
| `fantasylifeithegirlwhostealstime-root` | 39 |
| `fantasylifeithegirlwhostealstime-binaries` | 49 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open Config Folder
- Open Saves Folder
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

