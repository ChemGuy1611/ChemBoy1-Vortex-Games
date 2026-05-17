# PC Building Simulator — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | PC Building Simulator Vortex Extension |
| Engine / Structure | Unity BepinEx |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `pcbuildingsimulator` |
| Executable | `PCBS.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1493](https://www.nexusmods.com/site/mods/1493) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/PC_Building_Simulator](https://www.pcgamingwiki.com/wiki/PC_Building_Simulator) |

## Supported Stores

- **Steam** — `621060`
- **Epic Games Store** — `ab277c0995e945d2b2c50c46883627f1`
- **GOG** — `2147483071`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `downloadCfgMan` | `false` | should BepInExConfigManager be downloaded? |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `pcbuildingsimulator-root` | high | `{gamePath}` |
| Assembly DLL Mod | `pcbuildingsimulator-assemblydll` | high | `{gamePath}/PCBS_Data/Managed` |
| BepInEx Configuration Manager | `pcbuildingsimulator-bepcfgman` | high | `{gamePath}/Bepinex` |
| BepInEx Mod | `pcbuildingsimulator-bepmods` | high | `{gamePath}/BepinEx/plugins` |
| Save | `pcbuildingsimulator-save` | high | `{gamePath}/Saves` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `pcbuildingsimulator-root` | 8 |
| `pcbuildingsimulator-bepcfgman` | 9 |
| `pcbuildingsimulator-assemblydll` | 48 |
| `pcbuildingsimulator-save` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`PCBS.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open BepInEx.cfg
- Open Data Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx | 5.4.23.5 | unitymono, x64 |
| BepInEx Configuration Manager | 18.4.1 | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\The Irregular Corp\\PC Building Simulator` |
| Save | `Saves` |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Required Extensions** — depends on: `modtype-bepinex`.

