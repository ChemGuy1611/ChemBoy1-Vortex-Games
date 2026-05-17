# ROMEO IS A DEAD MAN — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | ROMEO IS A DEAD MAN Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `romeoisadeadman` |
| Executable | `SevGame.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `SevGame.exe` |
| Executable (Demo) | `SevGame.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1693](https://www.nexusmods.com/site/mods/1693) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Romeo_Is_a_Dead_Man](https://www.pcgamingwiki.com/wiki/Romeo_Is_a_Dead_Man) |

## Supported Stores

- **Steam** — `3050900`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `true` | NOT ON GAME PASS |
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
| UE4SS Script-LogicMod Combo | `romeoisadeadman-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `romeoisadeadman-logicmods` | high | `{gamePath}/SevGame/Content/Paks` |
| Paks (no "~mods") | `romeoisadeadman-pakalt` | high | `{gamePath}/SevGame/Content/Paks` |
| Root Game Folder | `romeoisadeadman-root` | high | `{gamePath}` |
| Root Sub-Folders | `romeoisadeadman-rootsubfolders` | high | `{gamePath}/SevGame` |
| UE Sortable Pak Mod | `romeoisadeadman-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `romeoisadeadman-scripts` | 50 | `?` |
| UE4SS DLL Mod | `romeoisadeadman-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `romeoisadeadman-binaries` | 54 | `?` |
| UE4SS | `romeoisadeadman-ue4ss` | 56 | `?` |
| Config (Local AppData) | `romeoisadeadman-config` | 62 | `?` |
| Saves (Local AppData) | `romeoisadeadman-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `romeoisadeadman-ue4sscombo` | 26 |
| `romeoisadeadman-logicmods` | 27 |
| `romeoisadeadman-ue4ss` | 31 |
| `romeoisadeadman-scripts` | 35 |
| `romeoisadeadman-ue4ssdll` | 37 |
| `romeoisadeadman-root` | 39 |
| `romeoisadeadman-config` | 41 |
| `romeoisadeadman-save` | 43 |
| `romeoisadeadman-binaries` | 49 |

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

