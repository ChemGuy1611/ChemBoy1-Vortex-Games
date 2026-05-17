# Horizon Zero Dawn Remastered — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Horizon Zero Dawn Remastered Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `horizonzerodawnremastered` |
| Executable | `HorizonZeroDawnRemastered.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1077](https://www.nexusmods.com/site/mods/1077) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Horizon_Zero_Dawn_Remastered](https://www.pcgamingwiki.com/wiki/Horizon_Zero_Dawn_Remastered) |

## Supported Stores

- **Steam** — `2561580`
- **Epic Games Store** — `Grunion`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `modManagerInstalled` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| DS2 Manager Mod | `horizonzerodawnremastered-managermod` | high | `{gamePath}/mods` |
| DS2 Mod Manager | `horizonzerodawnremastered-modmanager` | low | `{gamePath}` |
| Save Game (Documents) | `horizonzerodawnremastered-save` | high | `userDocsPathString/Horizon Zero Dawn Remastered/USERID_FOLDER` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `horizonzerodawnremastered-managermod` | 35 |
| `horizonzerodawnremastered-save` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`HorizonZeroDawnRemastered.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config/Save Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

