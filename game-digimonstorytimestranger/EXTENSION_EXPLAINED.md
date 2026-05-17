# Digimon Story Time Stranger — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Digimon Story Time Stranger Vortex Extension |
| Engine / Structure | Reloaded-II Game (Mod Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `digimonstorytimestranger` |
| Executable | `Digimon Story Time Stranger.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1480](https://www.nexusmods.com/site/mods/1480) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Digimon_Story%3A_Time_Stranger](https://www.pcgamingwiki.com/wiki/Digimon_Story%3A_Time_Stranger) |

## Supported Stores

- **Steam** — `1984270`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Reloaded Mod | `digimonstorytimestranger-reloadedmod` | high | `{gamePath}/Reloaded/Mods` |
| Mod Loader | `digimonstorytimestranger-reloadedmodloader` | low | `{gamePath}/Reloaded/Mods/` |
| Reloaded-II Mod Manager | `digimonstorytimestranger-reloadedmanager` | low | `{gamePath}` |
| Save File | `digimonstorytimestranger-save` | high | `{gamePath}/gamedata/savedata/` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `digimonstorytimestranger-reloadedmanager` | 25 |
| `digimonstorytimestranger-reloadedmodloader` | 27 |
| `digimonstorytimestranger-reloadedmod` | 29 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Reloaded Mod Manager
- Open Save Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Reloaded-II | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Save | `gamedata/savedata/` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

