# Tomb Raider (2013) — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Tomb Raider (2013) Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `tombraider2013` |
| Executable | `TombRaider.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/893](https://www.nexusmods.com/site/mods/893) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Tomb_Raider_%282013%29](https://www.pcgamingwiki.com/wiki/Tomb_Raider_%282013%29) |

## Supported Stores

- **Steam** — `203160`
- **Epic Games Store** — `d6264d56f5ba434e91d4b0a0b056c83a`
- **GOG** — `1724969043`
- **Xbox / Microsoft Store** — `39C668CD.TombRaiderDefinitiveEdition`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `tombraider2013-binaries` | high | `{gamePath}` |
| Manager Mod | `tombraider2013-managermod` | high | `{gamePath}/Mods` |
| TexMod Pack | `tombraider2013-texmodpack` | high | `{gamePath}/TexMod` |
| TR Reboot Mod Manager | `tombraider2013-trmodmanager` | low | `{gamePath}` |
| TexMod | `tombraider2013-texmod` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `tombraider2013-trmodmanager` | 25 |
| `tombraider2013-texmod` | 27 |
| `tombraider2013-texmodpack` | 29 |
| `tombraider2013-managermod` | 31 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Logs and Crash Dumps Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

