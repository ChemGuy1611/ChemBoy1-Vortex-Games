# CloverPit — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | CloverPit Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid (Mono & x64) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `cloverpit` |
| Executable | `CloverPit.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1496](https://www.nexusmods.com/site/mods/1496) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/CloverPit](https://www.pcgamingwiki.com/wiki/CloverPit) |

## Supported Stores

- **Steam** — `3314790`
- **Xbox / Microsoft Store** — `FutureFriendsGames.CloverPit`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BepInEx Mod | `cloverpit-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `cloverpit-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `cloverpit-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `cloverpit-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `cloverpit-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Plugins | `cloverpit-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Mods | `cloverpit-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Config | `cloverpit-melonloader-config` | high | `{gamePath}/UserData` |
| Assembly DLL Mod | `cloverpit-assemblydll` | high | `{gamePath}/CloverPit_Data/Managed` |
| BepInEx Configuration Manager | `cloverpit-bepcfgman` | high | `{gamePath}/Bepinex` |
| Assets/Resources File | `cloverpit-assets` | high | `{gamePath}/CloverPit_Data` |
| Root Game Folder | `cloverpit-root` | high | `{gamePath}` |
| BepInEx Injector | `cloverpit-bepinex` | low | `{gamePath}` |
| MelonLoader | `cloverpit-melonloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `cloverpit-bepinex` | 25 |
| `cloverpit-melonloader` | 26 |
| `cloverpit-root` | 27 |
| `cloverpit-bepcfgman` | 29 |
| `cloverpit-assemblydll` | 31 |
| `cloverpit-plugin` | 33 |
| `cloverpit-assets` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`CloverPit.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Saves Folder
- Open Data Folder
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
| Save | `SaveData/GameData` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

