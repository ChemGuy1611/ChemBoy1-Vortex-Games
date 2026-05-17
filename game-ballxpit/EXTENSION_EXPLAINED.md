# BALL x PIT — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | BALL x PIT Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `ballxpit` |
| Executable | `Balls.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1545](https://www.nexusmods.com/site/mods/1545) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Ball_X_Pit](https://www.pcgamingwiki.com/wiki/Ball_X_Pit) |

## Supported Stores

- **Steam** — `2062430`
- **Xbox / Microsoft Store** — `DevolverDigital.BallxPit`

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
| BepInEx Mod | `ballxpit-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `ballxpit-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `ballxpit-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `ballxpit-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `ballxpit-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `ballxpit-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `ballxpit-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `ballxpit-melonloader-config` | high | `{gamePath}/UserData` |
| Assembly DLL Mod | `ballxpit-assemblydll` | high | `{gamePath}/.` |
| BepInExConfigManager | `ballxpit-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `ballxpit-melonprefman` | high | `{gamePath}/Mods` |
| Assets/Resources File | `ballxpit-assets` | high | `{gamePath}/Balls_Data` |
| Root Game Folder | `ballxpit-root` | high | `{gamePath}` |
| BepInEx Injector | `ballxpit-bepinex` | low | `{gamePath}` |
| MelonLoader | `ballxpit-melonloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ballxpit-bepinex` | 25 |
| `ballxpit-melonloader` | 26 |
| `ballxpit-root` | 27 |
| `ballxpit-bepcfgman` | 29 |
| `ballxpit-melonprefman` | 30 |
| `ballxpit-assemblydll` | 31 |
| `ballxpit-plugin` | 33 |
| `ballxpit-assets` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Balls.exe`)

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
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Kenny Sun\\BALL x PIT` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

