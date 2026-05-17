# Deus Ex: Human Revolution — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Deus Ex: Human Revolution Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `deusexhumanrevolution` |
| Executable | `DXHRDC.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1468](https://www.nexusmods.com/site/mods/1468) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Deus_Ex%3A_Human_Revolution](https://www.pcgamingwiki.com/wiki/Deus_Ex%3A_Human_Revolution) |

## Supported Stores

- **Steam** — `238010`
- **GOG** — `1370227705`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| DXHRDC-ModHook | `deusexhumanrevolution-modhook` | low | `{gamePath}/.` |
| DXHR Patcher | `deusexhumanrevolution-patcher` | low | `{gamePath}/.` |
| Mod .000 File | `deusexhumanrevolution-mod000` | high | `{gamePath}/mods` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `deusexhumanrevolution-mod000` | 25 |
| `deusexhumanrevolution-patcher` | 27 |
| `deusexhumanrevolution-modhook` | 29 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`DXHRDC.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Save Folder (GOG)
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

