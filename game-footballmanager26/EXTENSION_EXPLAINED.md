# Football Manager 26 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Football Manager 26 Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `footballmanager26` |
| Executable | `fm.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1523](https://www.nexusmods.com/site/mods/1523) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Football_Manager_26](https://www.pcgamingwiki.com/wiki/Football_Manager_26) |

## Supported Stores

- **Steam** — `3551340`
- **Epic Games Store** — `e54a251079034694b55ab6289707bfa0`
- **Xbox / Microsoft Store** — `SportsInteractive.FootballManager26`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowBepCfgMan` | `false` | should BepInExConfigManager be downloaded? |
| `allowMelPrefMan` | `false` | should MelonPreferencesManager be downloaded? False until figure out UniverseLib dependency |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `allowMelonNexus` | `false` | set false until bugs are fixed |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BepInEx Mod | `footballmanager26-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `footballmanager26-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `footballmanager26-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `footballmanager26-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `footballmanager26-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `footballmanager26-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `footballmanager26-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `footballmanager26-melonloader-config` | high | `{gamePath}/UserData` |
| Assembly DLL Mod | `footballmanager26-assemblydll` | high | `{gamePath}/.` |
| BepInExConfigManager | `footballmanager26-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `footballmanager26-melonprefman` | high | `{gamePath}/Mods` |
| Assets/Resources File | `footballmanager26-assets` | high | `{gamePath}/fm_Data` |
| Root Game Folder | `footballmanager26-root` | high | `{gamePath}` |
| BepInEx Injector | `footballmanager26-bepinex` | low | `{gamePath}` |
| MelonLoader | `footballmanager26-melonloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `footballmanager26-bepinex` | 25 |
| `footballmanager26-melonloader` | 26 |
| `footballmanager26-root` | 27 |
| `footballmanager26-bepcfgman` | 29 |
| `footballmanager26-melonprefman` | 30 |
| `footballmanager26-assemblydll` | 31 |
| `footballmanager26-plugin` | 33 |
| `footballmanager26-assets` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`fm.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Data Folder
- Open Save Folder
- Open BepInEx Config
- Open BepInEx Log
- Download BepInExConfigManager
- Open MelonLoader Config
- Open MelonLoader Log
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx | 5.4.23.5 | il2cpp |
| BepInEx Configuration Manager | 18.4.1 | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Sports Interactive\\Football Manager 26` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

