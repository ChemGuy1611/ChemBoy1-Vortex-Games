# God of War: Ragnarok — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | God of War: Ragnarok Vortex Extension |
| Engine / Structure | Sony Port, Custom Game Data |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `godofwarragnarok` |
| Executable | `GoWR.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/959](https://www.nexusmods.com/site/mods/959) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/God_of_War_Ragnar%C3%B6k](https://www.pcgamingwiki.com/wiki/God_of_War_Ragnar%C3%B6k) |

## Supported Stores

- **Steam** — `2322010`
- **Epic Games Store** — `456afef39a4c4cbbb6b17e92201443d7`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| exec folder | `godofwarragnarok-data` | high | `{gamePath}` |
| patch Folder | `godofwarragnarok-patchfolder` | high | `{gamePath}/exec` |
| exec subfolder | `godofwarragnarok-execsub` | high | `{gamePath}/exec` |
| Texpack/Lodpack | `godofwarragnarok-pack` | high | `{gamePath}/exec/patch/pc_le` |
| Lua Mod | `godofwarragnarok-luamod` | high | `{gamePath}/mod` |
| Save (Documents) | `godofwarragnarok-save` | high | `userHomePathSanitize/Saved Games/God of War Ragnar\u00F6k/USERID_FOLDER` |
| GoWR-Script-Loader | `godofwarragnarok-scriptloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `godofwarragnarok-scriptloader` | 25 |
| `godofwarragnarok-data` | 27 |
| `godofwarragnarok-patchfolder` | 29 |
| `godofwarragnarok-execsub` | 31 |
| `godofwarragnarok-pack` | 33 |
| `godofwarragnarok-luamod` | 35 |
| `godofwarragnarok-save` | 37 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download ${LOADER_NAME}
- Open Settings INI
- Open boot-options.json
- Open GoWR-Script-Loader Config
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| GoWR-Script-Loader | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

