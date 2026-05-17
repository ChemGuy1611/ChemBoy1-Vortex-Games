# Hollow Knight — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Hollow Knight Vortex Extension |
| Engine / Structure | Unity BepinEx |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `hollowknight` |
| Executable | `hollow_knight.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Hollow Knight.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/376](https://www.nexusmods.com/site/mods/376) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Hollow_Knight](https://www.pcgamingwiki.com/wiki/Hollow_Knight) |

## Supported Stores

- **Steam** — `367520`
- **GOG** — `1308320804`
- **Xbox / Microsoft Store** — `TeamCherry.15373CD61C66B`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `downloadCfgMan` | `true` | should BepInExConfigManager be downloaded? |
| `bleedingEdge` | `false` | set to true to download bleeding edge builds of BepInEx (IL2CPP only) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `hollowknight-root` | high | `{gamePath}` |
| BepInEx Configuration Manager | `hollowknight-bepcfgman` | high | `{gamePath}/Bepinex` |
| BepInEx Mod | `hollowknight-bepmods` | high | `{gamePath}/BepinEx/plugins` |
| Assembly DLL Mod | `hollowknight-assemblydll` | 60 | `?` |
| Assets/Resources File | `hollowknight-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `hollowknight-root` | 8 |
| `hollowknight-bepcfgman` | 9 |
| `hollowknight-assemblydll` | 25 |
| `hollowknight-assets` | 27 |
| `hollowknight-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`hollow_knight.exe`)
- **Custom Launch** (`Hollow Knight.exe`)

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
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Team Cherry\\Hollow Knight` |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `modtype-bepinex`.

