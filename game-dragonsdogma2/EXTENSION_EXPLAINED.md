# Dragon's Dogma 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Dragon's Dogma 2 Vortex Extension |
| Engine / Structure | Fluffy + REFramework (RE Engine) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `dragonsdogma2` |
| Executable | `DD2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/851](https://www.nexusmods.com/site/mods/851) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Dragon%27s_Dogma_II](https://www.pcgamingwiki.com/wiki/Dragon%27s_Dogma_II) |

## Supported Stores

- **Steam** — `2054970`

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
| Binaries / Root Folder | `dragonsdogma2-root` | high | `{gamePath}` |
| Loose Lua (REFramework) | `dragonsdogma2-looselua` | high | `{gamePath}/.` |
| Fluffy Preset | `dragonsdogma2-preset` | high | `{gamePath}/Games/DragonsDogma2/Presets` |
| Fluffy Mod Manager | `dragonsdogma2-fluffymodmanager` | low | `{gamePath}` |
| Fluffy Mod | `dragonsdogma2-fluffymod` | high | `{gamePath}/Games/DragonsDogma2/Mods` |
| Fluffy Pak Mod | `dragonsdogma2-fluffypakmod` | high | `{gamePath}/Games/DragonsDogma2/Mods` |
| REFramework | `dragonsdogma2-reframework` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `dragonsdogma2-fluffymodmanager` | 25 |
| `dragonsdogma2-reframework` | 30 |
| `dragonsdogma2-looselua` | 41 |
| `dragonsdogma2-preset` | 43 |
| `dragonsdogma2-fluffymodzip` | 45 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest REFramework Nightly
- Open PCGamingWiki Page
- Open Nexus Mods Page
- Open SteamDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder
- Open Save Folder (Steam)

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Fluffy Mod Manager | — | — |
| REFramework | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Save | `/userdata` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
