# Escape from Duckov — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Escape from Duckov Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `escapefromduckov` |
| Executable | `Duckov.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1517](https://www.nexusmods.com/site/mods/1517) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Escape_From_Duckov](https://www.pcgamingwiki.com/wiki/Escape_From_Duckov) |

## Supported Stores

- **Steam** — `3167020`
- **Epic Games Store** — `193b4a828e34492290723483331580ce`

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
| BepInEx Mod | `escapefromduckov-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `escapefromduckov-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `escapefromduckov-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `escapefromduckov-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `escapefromduckov-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `escapefromduckov-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `escapefromduckov-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `escapefromduckov-melonloader-config` | high | `{gamePath}/UserData` |
| Assembly DLL Mod | `escapefromduckov-assemblydll` | high | `{gamePath}/.` |
| BepInEx Config Manager | `escapefromduckov-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferences Manager | `escapefromduckov-melonprefman` | high | `{gamePath}/Mods` |
| Assets/Resources File | `escapefromduckov-assets` | high | `{gamePath}/Duckov_Data` |
| Root Game Folder | `escapefromduckov-root` | high | `{gamePath}` |
| BepInEx Injector | `escapefromduckov-bepinex` | low | `{gamePath}` |
| MelonLoader | `escapefromduckov-melonloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `escapefromduckov-bepinex` | 25 |
| `escapefromduckov-melonloader` | 26 |
| `escapefromduckov-root` | 27 |
| `escapefromduckov-bepcfgman` | 29 |
| `escapefromduckov-melonprefman` | 30 |
| `escapefromduckov-assemblydll` | 31 |
| `escapefromduckov-plugin` | 33 |
| `escapefromduckov-assets` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Duckov.exe`)

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
| BepInEx | 5.4.23.5 | mono |
| BepInEx Configuration Manager | 18.4.1 | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\TeamSoda\\Duckov` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

