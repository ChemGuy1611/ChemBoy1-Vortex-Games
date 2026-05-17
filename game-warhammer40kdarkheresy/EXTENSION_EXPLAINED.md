# Warhammer 40,000: Dark Heresy — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Warhammer 40,000: Dark Heresy Vortex Extension |
| Engine / Structure | Game with Integrated Mod Loader (UnityModManager) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `warhammer40kdarkheresy` |
| Executable | `WH40KDH.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `WH40KDH.exe` |
| Extension Page | [XXX](XXX) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Warhammer_40,000:_Dark_Heresy](https://www.pcgamingwiki.com/wiki/Warhammer_40,000:_Dark_Heresy) |

## Supported Stores

- **Steam** — `3710600`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `LOAD_ORDER_ENABLED` | `true` | enables load order sorting |
| `debug` | `false` | enables verbose debug logging |
| `mod_update_all_profile` | `false` |  |
| `updating_mod` | `false` | used to see if it's a mod update or not |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Plugin (UnityModManager) | `warhammer40kdarkheresy-plugin` | high | `USER_HOME/AppData/LocalLow/Owlcat Games/Warhammer 40000 Rogue Trader/UnityModManager` |
| Owlcat Mod | `warhammer40kdarkheresy-mod` | high | `USER_HOME/AppData/LocalLow/Owlcat Games/Warhammer 40000 Rogue Trader/Modifications` |
| Portraits | `warhammer40kdarkheresy-portrait` | high | `USER_HOME/AppData/LocalLow/Owlcat Games/Warhammer 40000 Rogue Trader/Portraits` |
| Save | `warhammer40kdarkheresy-save` | high | `USER_HOME/AppData/LocalLow/Owlcat Games/Warhammer 40000 Rogue Trader/Saved Games` |
| MicroPatches | `warhammer40kdarkheresy-micropatches` | low | `MICROPATCHES_PATH` |
| Root Folder | `warhammer40kdarkheresy-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `warhammer40kdarkheresy-binaries` | high | `{gamePath}/BINARIES_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `warhammer40kdarkheresy-micropatches` | 25 |
| `warhammer40kdarkheresy-modfinder` | 27 |
| `warhammer40kdarkheresy-saveeditor` | 28 |
| `warhammer40kdarkheresy-portraitmanager` | 29 |
| `warhammer40kdarkheresy-mod` | 31 |
| `warhammer40kdarkheresy-plugin` | 33 |
| `warhammer40kdarkheresy-portrait` | 35 |
| `warhammer40kdarkheresy-save` | 47 |
| `warhammer40kdarkheresy-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`WH40KDH.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open OwlcatModificationManagerSettings.json File
- Open Owlcat Mod Folder
- Open UMM Plugin Folder
- Open Portraits Folder
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

