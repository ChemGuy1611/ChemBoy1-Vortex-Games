# God of War (2018) — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | God of War (2018) Vortex Extension |
| Engine / Structure | Sony Port, Custom Game Data |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `godofwar` |
| Executable | `GoW.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/340](https://www.nexusmods.com/site/mods/340) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/God_of_War](https://www.pcgamingwiki.com/wiki/God_of_War) |

## Supported Stores

- **Steam** — `1593500`
- **Epic Games Store** — `456afef39a4c4cbbb6b17e92201443d7`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| exec folder | `godofwar-data` | high | `{gamePath}` |
| patch Folder | `godofwar-patchfolder` | high | `{gamePath}/exec` |
| exec subfolder | `godofwar-execsub` | high | `{gamePath}/exec` |
| Texpack/Lodpack | `godofwar-pack` | high | `{gamePath}/exec/patch/pc_le` |
| Texpack/Lodpack | `godofwar-pack` | high | `{gamePath}/exec/patch/pc_le` |
| Lua Mod | `godofwar-luamod` | high | `{gamePath}/mods` |
| Save (User Home) | `godofwar-save` | high | `USER_HOME/Saved Games/God of War/USERID_FOLDER` |
| Script Loader | `godofwar-scriptloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `godofwar-scriptloader` | 25 |
| `godofwar-data` | 27 |
| `godofwar-patchfolder` | 29 |
| `godofwar-execsub` | 31 |
| `godofwar-pack` | 33 |
| `godofwar-luamod` | 35 |
| `godofwar-save` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`GoW.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download ${LOADER_NAME}
- Open Settings INI
- Open boot-options.json
- Open Script Loader Config
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Script Loader | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

