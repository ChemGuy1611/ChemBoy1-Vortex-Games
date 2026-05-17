# Warhammer 40,000: Space Marine 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | WH40K Space Marine 2 Vortex Extension |
| Engine / Structure | Mods Folder w/ LO |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `warhammer40000spacemarine2` |
| Executable | `Warhammer 40000 Space Marine 2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/961](https://www.nexusmods.com/site/mods/961) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Warhammer_40,000:_Space_Marine_II](https://www.pcgamingwiki.com/wiki/Warhammer_40,000:_Space_Marine_II) |

## Supported Stores

- **Steam** — `2183900`
- **Epic Games Store** — `bb6054d614284c39bb203ebe134e5d79`
- **Xbox / Microsoft Store** — `FocusHomeInteractiveSA.Magnus`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `loadOrderEnabled` | `true` | enables load order sorting for mods |
| `mod_update_all_profile` | `false` |  |
| `updating_mod` | `false` | used to see if it's a mod update or not |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries (Engine Injector) | `warhammer40000spacemarine2-binaries` | high | `{gamePath}/client_pc/root/bin/pc` |
| Config (LocalAppData) | `warhammer40000spacemarine2-config` | high | `LOCALAPPDATA/Saber/Space Marine 2` |
| Paks | `warhammer40000spacemarine2-pak` | high | `{gamePath}/client_pc/root/mods` |
| Local (Loose) | `warhammer40000spacemarine2-local` | high | `{gamePath}/client_pc/root` |
| Local (Loose Subfolder) | `warhammer40000spacemarine2-localsub` | high | `{gamePath}/client_pc/root/local` |
| Root Game Folder | `warhammer40000spacemarine2-root` | high | `{gamePath}` |
| Integration Studio | `warhammer40000spacemarine2-integrationstudio` | low | `{gamePath}/client_pc/root` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `warhammer40000spacemarine2-integrationstudio` | 25 |
| `warhammer40000spacemarine2-pak` | 27 |
| `warhammer40000spacemarine2-root` | 29 |
| `warhammer40000spacemarine2-local` | 31 |
| `warhammer40000spacemarine2-localsub` | 33 |
| `warhammer40000spacemarine2-binaries` | 49 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- === RESTORE SAVES ===
- Open Saves (Profile) Folder
- Open ${LO_FILE} (Load Order)
- Download Integration Studio
- Download Index V2
- Open Binaries Folder
- Open Loose Mods Folder
- Open Pak Mods Folder
- Open Local AppData Folder
- Open Crash Reports Folder
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
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

