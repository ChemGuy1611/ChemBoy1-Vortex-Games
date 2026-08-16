# Marvel Rivals — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Marvel Rivals Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `marvelrivals` |
| Executable | `MarvelGame/Marvel.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1132](https://www.nexusmods.com/site/mods/1132) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Marvel_Rivals](https://www.pcgamingwiki.com/wiki/Marvel_Rivals) |

## Supported Stores

- **Steam** — `2767030`
- **Epic Games Store** — `575efd0b5dd54429b035ffc8fe2d36d0`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `preferHardlinks` | `true` | set true to perform partition checks when IO_STORE is false so that hardlinks are available to more users |
| `SIGBYPASS_REQUIRED` | `true` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `FBLO` | `true` | set to false to use legacy load order page |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_CONFIG` | `false` | boolean to check if game, staging folder, and config folder are on the same drive |
| `mod_update_all_profile` | `false` | for mod update to keep them in the load order and not uncheck them |
| `updating_mod` | `false` | used to see if it's a mod update or not |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Loose Data Files | `marvelrivals-root` | high | `{gamePath}/MarvelGame/Marvel/Content` |
| UE5 Paks | `marvelrivals-ue5` | high | `{gamePath}/MarvelGame/Marvel/Content/Paks/~mods` |
| UE5 Paks (no ~mods) | `marvelrivals-pakalt` | high | `{gamePath}/MarvelGame/Marvel/Content/Paks` |
| Signature Bypass | `marvelrivals-sigbypass` | low | `{gamePath}/MarvelGame/Marvel/Binaries/Win64` |
| UE5 Sortable Mod | `marvelrivals-ue5-sortable-modtype` | 25 | `?` |
| Legacy UE - REINSTALL TO SORT | `ue5-sortable-modtype` | 65 | `?` |
| Config (LocalAppData) | `marvelrivals-config` | 45 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `marvelrivals-root` | 30 |
| `marvelrivals-ue5-sortable-modtype` | 35 |
| `marvelrivals-sigbypass` | 37 |
| `marvelrivals-config` | 40 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open Config Folder (LocalAppData)
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Load Order** — mods are assigned numbered folder names or sorted based on their position in the load order.
- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Signature Bypass** — .sig file bypass is required for pak mods.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

