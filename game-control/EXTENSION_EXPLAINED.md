# Control — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Control Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `control` |
| Executable | `Control.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/162](https://www.nexusmods.com/site/mods/162) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Control](https://www.pcgamingwiki.com/wiki/Control) |

## Supported Stores

- **Steam** — `870780`
- **Epic Games Store** — `Calluna`
- **GOG** — `2049187585`
- **Xbox / Microsoft Store** — `505GAMESS.P.A.ControlPCGP`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod Folder | `control-modfolder` | high | `{gamePath}` |
| Mod Files (data_packfiles) | `control-modpack` | high | `{gamePath}/data_packfiles` |
| Root Folder | `control-root` | high | `{gamePath}` |
| Plugin Loader | `control-pluginloader` | low | `{gamePath}` |
| Loose File Loader | `control-loosefileloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `control-modfolder` | 25 |
| `control-modpack` | 30 |
| `control-loosefileloader` | 35 |
| `control-pluginloader` | 40 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Loader Logs Folder
- Open renderer.ini
- Open Saves Folder
- Open Save Editor (Web)
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

