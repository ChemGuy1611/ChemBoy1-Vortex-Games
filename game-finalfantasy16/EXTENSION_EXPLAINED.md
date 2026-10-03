# Final Fantasy XVI — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Final Fantasy XVI Vortex Extension |
| Engine / Structure | Reloaded-II Game (Mod Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `finalfantasy16` |
| Executable | `ffxvi.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (Demo) | `ffxvi_demo.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1041](https://www.nexusmods.com/site/mods/1041) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Final_Fantasy_XVI](https://www.pcgamingwiki.com/wiki/Final_Fantasy_XVI) |

## Supported Stores

- **Steam** — `2515020`
- **Epic Games Store** — `af0318aa20f443ac901a172c389d8303`
- **Xbox / Microsoft Store** — `39EA002F.Hermia`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `true` | enable to show the user a notification with special instructions (specify below) - default true: Reloaded-II Mod Manager setup instructions are always relevant |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Reloaded Mod | `finalfantasy16-reloadedmod` | high | `{gamePath}/Reloaded/Mods` |
| Mod Loader | `finalfantasy16-reloadedmodloader` | low | `{gamePath}/Reloaded/Mods/FF16_Mod_Loader` |
| Reloaded Mod Manager | `finalfantasy16-reloadedmanager` | low | `{gamePath}` |
| Save File | `finalfantasy16-save` | high | `DOCUMENTS/My Games/FINAL FANTASY XVI/USERID_FOLDER` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `finalfantasy16-reloadedmanager` | 25 |
| `finalfantasy16-reloadedmodloader` | 27 |
| `finalfantasy16-reloadedmod` | 29 |
| `finalfantasy16-fallback` | 49 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Reloaded Mod Manager
- Open PCGamingWiki Page
- Open SteamDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Reloaded-II | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
