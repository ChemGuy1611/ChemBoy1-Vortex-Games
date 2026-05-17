# Megabonk — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Megabonk Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid (IL2CPP & x64) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `megabonk` |
| Executable | `Megabonk.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1495](https://www.nexusmods.com/site/mods/1495) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Megabonk](https://www.pcgamingwiki.com/wiki/Megabonk) |

## Supported Stores

- **Steam** — `3405340`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BepInEx Mod | `megabonk-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `megabonk-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `megabonk-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `megabonk-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `megabonk-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Plugins | `megabonk-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Mods | `megabonk-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Config | `megabonk-melonloader-config` | high | `{gamePath}/UserData` |
| Assembly DLL Mod | `megabonk-assemblydll` | high | `{gamePath}/.` |
| BepInEx Configuration Manager | `megabonk-bepcfgman` | high | `{gamePath}/Bepinex` |
| Assets/Resources File | `megabonk-assets` | high | `{gamePath}/Megabonk_Data` |
| Root Game Folder | `megabonk-root` | high | `{gamePath}` |
| BepInEx Injector | `megabonk-bepinex` | low | `{gamePath}` |
| MelonLoader | `megabonk-melonloader` | low | `{gamePath}` |
| Custom Characters | `megabonk-customcharacters` | 60 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `megabonk-bepinex` | 25 |
| `megabonk-melonloader` | 26 |
| `megabonk-root` | 27 |
| `megabonk-bepcfgman` | 29 |
| `megabonk-assemblydll` | 31 |
| `megabonk-plugin` | 33 |
| `megabonk-assets` | 37 |
| `megabonk-customcharacters` | 39 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Megabonk.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Data Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx Configuration Manager | 18.4.1 | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Ved\\Megabonk` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

