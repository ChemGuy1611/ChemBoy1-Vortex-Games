# NINJA GAIDEN 4 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | NINJA GAIDEN 4 Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `ninjagaidenfour` |
| Executable | `./NINJAGAIDEN4-Steam.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1501](https://www.nexusmods.com/site/mods/1501) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Ninja_Gaiden_4](https://www.pcgamingwiki.com/wiki/Ninja_Gaiden_4) |

## Supported Stores

- **Steam** — `2627260`
- **Xbox / Microsoft Store** — `Microsoft.TOROretail`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Asset Mod | `ninjagaidenfour-asset` | high | `{gamePath}/Assets` |
| Root Folder | `ninjagaidenfour-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `ninjagaidenfour-binaries` | high | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ninjagaidenfour-root` | 25 |
| `ninjagaidenfour-asset` | 27 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`./NINJAGAIDEN4-Steam.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Save/Config Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

