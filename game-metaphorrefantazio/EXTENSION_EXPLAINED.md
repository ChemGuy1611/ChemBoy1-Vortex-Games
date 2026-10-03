# Metaphor: ReFantazio — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Metaphor: ReFantazio Vortex Extension |
| Engine / Structure | Reloaded-II Game (Mod Installer) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `metaphorrefantazio` |
| Executable | `METAPHOR.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1062](https://www.nexusmods.com/site/mods/1062) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Metaphor%3A_ReFantazio](https://www.pcgamingwiki.com/wiki/Metaphor%3A_ReFantazio) |

## Supported Stores

- **Steam** — `2679460`
- **Xbox / Microsoft Store** — `SEGAofAmericaInc.Pae22b02y`

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
| Reloaded Mod | `metaphorrefantazio-reloadedmod` | high | `{gamePath}/Reloaded/Mods` |
| MRFPC Mod Loader | `metaphorrefantazio-reloadedmodloader` | low | `{gamePath}/Reloaded/Mods/MRFPC_Mod_Loader` |
| Reloaded Mod Manager | `metaphorrefantazio-reloadedmanager` | low | `{gamePath}` |
| Save File | `metaphorrefantazio-save` | high | `ROAMINGAPPDATA/SEGA/METAPHOR/Steam/USERID_FOLDER` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `metaphorrefantazio-reloadedmanager` | 25 |
| `metaphorrefantazio-reloadedmodloader` | 27 |
| `metaphorrefantazio-reloadedmod` | 29 |
| `metaphorrefantazio-fallback` | 49 |

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
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
