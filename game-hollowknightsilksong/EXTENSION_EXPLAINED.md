# Hollow Knight: Silksong — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Hollow Knight: Silksong Vortex Extension |
| Engine / Structure | Unity BepinEx |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `hollowknightsilksong` |
| Executable | `Hollow Knight Silksong.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1420](https://www.nexusmods.com/site/mods/1420) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Hollow_Knight:_Silksong](https://www.pcgamingwiki.com/wiki/Hollow_Knight:_Silksong) |

## Supported Stores

- **Steam** — `1030300`
- **GOG** — `1558393671`
- **Xbox / Microsoft Store** — `TeamCherry.HollowKnightSilksong`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `downloadCfgMan` | `true` | should BepInExConfigManager be downloaded? |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `hollowknightsilksong-root` | high | `{gamePath}` |
| Assembly DLL Mod | `hollowknightsilksong-assemblydll` | high | `{gamePath}/Hollow Knight Silksong_Data/Managed` |
| BepInEx Configuration Manager | `hollowknightsilksong-bepcfgman` | high | `{gamePath}/Bepinex` |
| BepinEx Mod | `hollowknightsilksong-bepmods` | high | `{gamePath}/BepinEx/plugins` |
| Skin Mod | `hollowknightsilksong-skin` | 50 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `hollowknightsilksong-root` | 8 |
| `hollowknightsilksong-bepcfgman` | 9 |
| `hollowknightsilksong-assemblydll` | 33 |
| `hollowknightsilksong-skin` | 35 |
| `hollowknightsilksong-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Hollow Knight Silksong.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download BepInExConfigManager
- Open BepInEx.cfg
- Open Data Folder
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx | 5.4.23.5 | unitymono, x64 |
| BepInEx Configuration Manager | 18.4.1 | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Team Cherry\\Hollow Knight Silksong` |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `modtype-bepinex`.

