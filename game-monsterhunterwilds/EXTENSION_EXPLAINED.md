# Monster Hunter Wilds — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Monster Hunter Wilds Vortex Extension |
| Engine / Structure | Fluffy + REFramework (RE Engine) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `monsterhunterwilds` |
| Executable | `MonsterHunterWilds.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1149](https://www.nexusmods.com/site/mods/1149) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Monster_Hunter_Wilds](https://www.pcgamingwiki.com/wiki/Monster_Hunter_Wilds) |

## Supported Stores

- **Steam** — `2246340`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `useRefNightly` | `false` | toggle for using the REFramework nightly instead of Nexus release |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `reZip` | `true` | NOT WORKING YET - KEEP AS TRUE FOR NOW - set to true to re-zip Fluffy Mods (possibly not necessary for FLUFFY v3.069+) |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `multiExe` | `false` | set to true if there are multiple executables (and multiple FLUFFY_FOLDERs) (typically for Demo) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `monsterhunterwilds-root` | high | `{gamePath}` |
| Fluffy Mod | `monsterhunterwilds-fluffymod` | high | `{gamePath}/Games/MonsterHunterWilds/Mods` |
| Fluffy Pak Mod | `monsterhunterwilds-fluffypakmod` | high | `{gamePath}/Games/MonsterHunterWilds/Mods` |
| Loose Lua (REFramework) | `monsterhunterwilds-looselua` | high | `{gamePath}/.` |
| Fluffy Preset | `monsterhunterwilds-preset` | high | `{gamePath}/Games/MonsterHunterWilds/Presets` |
| Fluffy Mod Manager | `monsterhunterwilds-fluffymanager` | low | `{gamePath}` |
| REFramework | `monsterhunterwilds-reframework` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `monsterhunterwilds-fluffymanager` | 25 |
| `monsterhunterwilds-reframework` | 27 |
| `monsterhunterwilds-looselua` | 33 |
| `monsterhunterwilds-root` | 35 |
| `monsterhunterwilds-preset` | 37 |
| `monsterhunterwilds-fluffymodzip` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`MonsterHunterWilds.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest REFramework Nightly
- Open Config File
- Open Save Folder (Steam)
- Open PCGamingWiki Page
- Open Nexus Mods Page
- Open SteamDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Fluffy Mod Manager | — | — |
| REFramework | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `config.ini` |
| Save | `/userdata` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
