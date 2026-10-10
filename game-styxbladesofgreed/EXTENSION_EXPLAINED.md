# Styx: Blades of Greed — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Styx: Blades of Greed Vortex Extension |
| Engine / Structure | Unreal Engine 4-5 Game |
| Author | ChemBoy1 |

### Notes

- The game is Unreal Engine 5.6.0. UE4SS 3.0.1 is deployed on the test install, but it was not confirmed that the game starts with it; other UE 5.6 games needed a hand-made ue4ss\UE4SS_Signatures\*.lua next to stock UE4SS, which the Download UE4SS button does not provide.
- Config (%LOCALAPPDATA%\Styx3\Saved\Config\WindowsClient), flat SaveGames (no user id folder) and the shipping exe (Styx3-Win64-Shipping.exe) were confirmed on disk. The test install is a repack with no Steam/Epic/GOG files, so store and game version detection are unverified.
- Xbox: no Microsoft Store PC listing. The Steam demo (4126390) is no longer available.

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `styxbladesofgreed` |
| Executable | `Styx3.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Styx3.exe` |
| Executable (Demo) | `Styx3.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1650](https://www.nexusmods.com/site/mods/1650) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Styx:_Blades_of_Greed](https://www.pcgamingwiki.com/wiki/Styx:_Blades_of_Greed) |

## Supported Stores

- **Steam** — `3290690`
- **Epic Games Store** — `c7eaa439ee0145a694eb72000885f171`
- **GOG** — `2126587036`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `hasServer` | `false` | toggle for server pak mod logic |
| `preferHardlinks` | `true` | set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS (only applies when ue4ssLoadOrder is enabled) |
| `writeEngineVersion` | `false` | toggle to write ENGINE_VERSION into UE4SS-settings.ini (EngineVersionOverride) on deploy, when UE4SS is installed |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |
| `exeHasGameVersion` | `false` | toggle: true if the game devs stamp the real game version (not just the UE engine version) into the exe ProductVersion |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `FBLO` | `true` | set to false to use legacy load order page |
| `ue4ssLoadOrder` | `true` | master toggle for UE4SS support: UE4SS/Scripts/DLL/LogicMods mod types and installers, UE4SS buttons, load order page, and mods.txt writing |
| `logicModsLoadOrder` | `true` | enable load order page and load_order.txt writing for LogicMods/Blueprint pak mods |
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
| UE4SS Script-LogicMod Combo | `styxbladesofgreed-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `styxbladesofgreed-logicmods` | high | `{gamePath}/Styx3/Content/Paks` |
| Paks (no "~mods") | `styxbladesofgreed-pakalt` | high | `{gamePath}/Styx3/Content/Paks` |
| Root Folder | `styxbladesofgreed-root` | high | `{gamePath}` |
| UE Sortable Pak Mod | `styxbladesofgreed-uesortablepak` | 25 | `?` |
| UE4SS Script Mod | `styxbladesofgreed-scripts` | 50 | `?` |
| UE4SS DLL Mod | `styxbladesofgreed-ue4ssdll` | 52 | `?` |
| Binaries (Engine Injector) | `styxbladesofgreed-binaries` | 54 | `?` |
| UE4SS | `styxbladesofgreed-ue4ss` | 56 | `?` |
| Config (Local AppData) | `styxbladesofgreed-config` | 62 | `?` |
| Saves (Local AppData) | `styxbladesofgreed-save` | 64 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `styxbladesofgreed-ue4sscombo` | 26 |
| `styxbladesofgreed-logicmods` | 27 |
| `styxbladesofgreed-uesortablepak` | 29 |
| `styxbladesofgreed-ue4ss` | 31 |
| `styxbladesofgreed-scripts` | 35 |
| `styxbladesofgreed-ue4ssdll` | 37 |
| `styxbladesofgreed-root` | 39 |
| `styxbladesofgreed-config` | 41 |
| `styxbladesofgreed-save` | 43 |
| `styxbladesofgreed-binaries` | 49 |

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
- Open Nexus Mods Page
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
- **UE4SS Load Order** — manages UE4SS script/DLL mod load order via a dedicated page; serializes order to `mods.txt` on deploy.
- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
