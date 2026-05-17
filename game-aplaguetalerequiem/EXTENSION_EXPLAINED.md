# A Plague Tale: Requiem — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | A Plague Tale Requiem Vortex Extension |
| Engine / Structure | Basic Game (XBOX Integrated) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `aplaguetalerequiem` |
| Executable | `APlagueTaleRequiem_x64.exe` |
| Executable (Xbox) | `APT2_WinStore.x64.Submission.exe` |
| Executable (GOG) | `APlagueTaleRequiem_x64.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/837](https://www.nexusmods.com/site/mods/837) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/A_Plague_Tale%3A_Requiem](https://www.pcgamingwiki.com/wiki/A_Plague_Tale%3A_Requiem) |

## Supported Stores

- **Steam** — `1182900`
- **Epic Games Store** — `da49ca987d764445bfeac7bc64cb8ff0`
- **GOG** — `1552771812`
- **Xbox / Microsoft Store** — `FocusHomeInteractiveSA.APlagueTaleRequiem-Windows`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `aplaguetalerequiem-root` | high | `{gamePath}` |
| Config | `aplaguetalerequiem-config` | high | `CONFIG_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `aplaguetalerequiem-root` | 25 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`APlagueTaleRequiem_x64.exe`)
- **Custom Launch** (`APT2_WinStore.x64.Submission.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

