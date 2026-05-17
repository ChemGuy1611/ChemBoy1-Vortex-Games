# Horizon Forbidden West — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Horizon Forbidden West Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `horizonforbiddenwest` |
| Executable | `HorizonForbiddenWest.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/844](https://www.nexusmods.com/site/mods/844) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Horizon_Forbidden_West](https://www.pcgamingwiki.com/wiki/Horizon_Forbidden_West) |

## Supported Stores

- **Steam** — `2420110`
- **Epic Games Store** — `2efe99166b8847e9bcd80c571b05e1b6`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `modManagerInstalled` | `false` |  |
| `repackerInstalled` | `false` |  |
| `loaderChoice` | `false` | toggle for choice of mod packer |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| HFW Manager Mod | `horizonforbiddenwest-managermod` | high | `{gamePath}/mods` |
| HFW Mod Manager | `horizonforbiddenwest-modmanager` | low | `{gamePath}` |
| Repacker | `horizonforbiddenwest-repacker` | low | `{gamePath}` |
| Save Game (Documents) | `horizonforbiddenwest-save` | low | `userDocsPathString/Horizon Forbidden West Complete Edition/USERID_FOLDER` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `horizonforbiddenwest-managermod` | 27 |
| `horizonforbiddenwest-save` | 25 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download HFW Mod Manager (Update)
- Open HFW Mod Manager Page
- Open Saves Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

