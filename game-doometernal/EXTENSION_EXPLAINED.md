# DOOM Eternal — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | DOOM Eternal Vortex Extension |
| Engine / Structure | 3rd party mod loader |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `doometernal` |
| Executable | `launcher/idTechLauncher.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/865](https://www.nexusmods.com/site/mods/865) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Doom_Eternal](https://www.pcgamingwiki.com/wiki/Doom_Eternal) |

## Supported Stores

- **Steam** — `782330`
- **Xbox / Microsoft Store** — `BethesdaSoftworks.DOOMEternal-PC`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `doometernal-binaries` | high | `{gamePath}` |
| SandBox (Modded Binaries) | `doometernal-sandbox` | high | `{gamePath}/doomSandBox` |
| EternalModInjector | `doometernal-injector` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `doometernal-rollback` | 25 |
| `doometernal-injector` | 30 |
| `doometernal-ktde` | 35 |
| `doometernal-meathook` | 40 |
| `doometernal-zip-mod` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Classic Modded Game** (`doometernalx64vk.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download EternalModInjector v${INJ_REV} (${INJ_DL_ID})
- Open Config Folder
- Open Saves Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

