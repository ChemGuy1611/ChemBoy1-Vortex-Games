# State of Decay 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | State of Decay 2 Vortex Extension |
| Engine / Structure | Unreal Engine 4-5 Game |
| Author | ChemBoy1 |

### Notes

- Rebuilt on the unified UE4-5 template, migrated to file-based load order (FBLO)
- Keeps Unreal Engine Mod Installer (UEMI) dependency for PAK installation - FBLO wired to UEMI's global 'ue4-sortable-modtype' via a loadOrderPrefixFunc wrapper (see trepang2/readyornot for reference wiring)
- Paks live entirely in LocalAppData (absModsPath), not under the game install folder - there is no in-gamePath Paks folder, so the template's PAK_ALT_ID "no ~mods" manual-reassign modtype is not registered for this game
- UE4SS/LogicMods stack ported but shipped dormant (ue4ssLoadOrder = false) - this game had no prior UE4SS support

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `stateofdecay2` |
| Executable | `StateOfDecay2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `StateOfDecay2.exe` |
| Executable (Demo) | `StateOfDecay2.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/946](https://www.nexusmods.com/site/mods/946) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/State_of_Decay_2](https://www.pcgamingwiki.com/wiki/State_of_Decay_2) |

## Supported Stores

- **Steam** — `495420`
- **Epic Games Store** — `Snoek`
- **Xbox / Microsoft Store** — `Microsoft.Dayton`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `true` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `setupNotification` | `true` | enable to show the user a notification with special instructions (specify below) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `hasServer` | `false` | toggle for server pak mod logic |
| `preferHardlinks` | `true` | set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS (only applies when ue4ssLoadOrder is enabled) |
| `writeEngineVersion` | `false` | toggle to write ENGINE_VERSION into UE4SS-settings.ini (EngineVersionOverride) on deploy, when UE4SS is installed |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `FBLO` | `true` | set to false to use legacy load order page |
| `ue4ssLoadOrder` | `false` | master toggle for UE4SS support: UE4SS/Scripts/DLL/LogicMods mod types and installers, UE4SS buttons, load order page, and mods.txt writing. Shipped dormant - this game had no prior UE4SS support; stack is wired so the toggle can flip later without a second pass. |
| `logicModsLoadOrder` | `false` | enable load order page and load_order.txt writing for LogicMods/Blueprint pak mods. Dormant with ue4ssLoadOrder - LogicMods need UE4SS's BPModLoaderMod, which this game doesn't offer while the stack is off. |
| `collectionsLoadOrder` | `true` | include UE4SS and LogicMods load orders in collections (ANDed with the toggles above) |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_CONFIG` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_SAVE` | `false` | secondary same as above (if save and config are in different locations) |
| `mod_update_all_profile` | `false` | for mod update to keep them in the load order and not uncheck them |
| `updating_mod` | `false` | used to see if it's a mod update or not |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `stateofdecay2-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `stateofdecay2-logicmods` | high | `{gamePath}/StateOfDecay2/Content/Paks` |
| Root Folder | `stateofdecay2-root` | high | `{gamePath}` |
| Cooked Mods | `stateofdecay2-cooked` | high | `{localAppData}/StateOfDecay2/Saved` |
| SoD2 Mod Manager | `stateofdecay2-modmanager` | low | `{gamePath}` |
| Binaries (Engine Injector) | `stateofdecay2-binaries` | 54 | `?` |
| Config (Local AppData) | `stateofdecay2-config` | 62 | `?` |
| Saves (Local AppData) | `stateofdecay2-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `stateofdecay2-ue4sscombo` | 23 |
| `stateofdecay2-root` | 39 |
| `stateofdecay2-config` | 41 |
| `stateofdecay2-save` | 43 |
| `stateofdecay2-cooked` | 45 |
| `stateofdecay2-modmanager` | 47 |
| `stateofdecay2-binaries` | 49 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Download SoD2 Mod Manager
- Open Binaries Folder
- Open Config Folder
- Open Saves Folder
- Open PCGamingWiki Page
- Open SteamDB Page
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
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `Unreal Engine Mod Installer`.
