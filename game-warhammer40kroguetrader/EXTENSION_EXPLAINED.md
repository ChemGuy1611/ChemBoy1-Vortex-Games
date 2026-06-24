# Warhammer 40,000: Rogue Trader — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Warhammer 40,000: Rogue Trader Vortex Extension |
| Engine / Structure | Game with Integrated Mod Loader (UnityModManager) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `warhammer40kroguetrader` |
| Executable | `WH40KRT.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `WH40KRT.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1627](https://www.nexusmods.com/site/mods/1627) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Warhammer_40,000:_Rogue_Trader](https://www.pcgamingwiki.com/wiki/Warhammer_40,000:_Rogue_Trader) |

## Supported Stores

- **Steam** — `2186680`
- **Epic Games Store** — ``
- **GOG** — `1347700224`
- **Xbox / Microsoft Store** — `OwlcatGames.3387926822CE4`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `LOAD_ORDER_ENABLED` | `true` | enables load order sorting |
| `debug` | `true` | enables verbose debug logging |
| `mod_update_all_profile` | `false` |  |
| `updating_mod` | `false` | used to see if it's a mod update or not |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Plugin (UnityModManager) | `warhammer40kroguetrader-plugin` | high | `USER_HOME/AppData/LocalLow/Owlcat Games/Warhammer 40000 Rogue Trader/UnityModManager` |
| Owlcat Mod | `warhammer40kroguetrader-mod` | high | `USER_HOME/AppData/LocalLow/Owlcat Games/Warhammer 40000 Rogue Trader/Modifications` |
| Portraits | `warhammer40kroguetrader-portrait` | high | `USER_HOME/AppData/LocalLow/Owlcat Games/Warhammer 40000 Rogue Trader/Portraits` |
| Save | `warhammer40kroguetrader-save` | high | `USER_HOME/AppData/LocalLow/Owlcat Games/Warhammer 40000 Rogue Trader/Saved Games` |
| MicroPatches | `warhammer40kroguetrader-micropatches` | low | `MICROPATCHES_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `warhammer40kroguetrader-micropatches` | 25 |
| `warhammer40kroguetrader-modfinder` | 27 |
| `warhammer40kroguetrader-saveeditor` | 28 |
| `warhammer40kroguetrader-portraitmanager` | 29 |
| `warhammer40kroguetrader-mod` | 31 |
| `warhammer40kroguetrader-plugin` | 33 |
| `warhammer40kroguetrader-portrait` | 35 |
| `warhammer40kroguetrader-save` | 47 |
| `warhammer40kroguetrader-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`WH40KRT.exe`)
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
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

