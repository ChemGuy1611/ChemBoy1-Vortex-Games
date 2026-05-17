# Disco Elysium — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Disco Elysium Vortex Extension |
| Engine / Structure | Unity BepinEx |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `discoelysium` |
| Executable | `disco.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `disco.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1643](https://www.nexusmods.com/site/mods/1643) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Disco_Elysium](https://www.pcgamingwiki.com/wiki/Disco_Elysium) |

## Supported Stores

- **Steam** — `632470`
- **Epic Games Store** — `7334aba246154b63857435cb9c7eecd5`
- **GOG** — `1771589310`
- **Xbox / Microsoft Store** — `ZAUMStudioDiscoElysiumUKL.DiscoElysium-TheFinalCut`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `multiExe` | `true` | set to true if there are multiple executables (e.g. for Xbox and PC) |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `downloadCfgMan` | `false` | should BepInExConfigManager be downloaded? |
| `bleedingEdge` | `true` | set to true to download bleeding edge builds of BepInEx (IL2CPP only) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `discoelysium-root` | high | `{gamePath}` |
| BepInEx Configuration Manager | `discoelysium-bepcfgman` | high | `{gamePath}/Bepinex` |
| BepInEx Mod | `discoelysium-bepmods` | high | `{gamePath}/BepinEx/plugins` |
| Assembly DLL Mod | `discoelysium-assemblydll` | 60 | `?` |
| Assets/Resources File | `discoelysium-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `discoelysium-root` | 8 |
| `discoelysium-bepcfgman` | 9 |
| `discoelysium-assemblydll` | 25 |
| `discoelysium-assets` | 27 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`disco.exe`)
- **Custom Launch** (`Disco Elysium.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open BepInEx.cfg
- Download BepInExConfigManager
- Open Data Folder
- Open Config Folder
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx | 6.0.0 | unityil2cpp, x64 |
| BepInEx Configuration Manager | 18.4.1 | — |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `modtype-bepinex`.

