# Diplomacy is Not an Option — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Diplomacy Is Not An Option Vortex Extension |
| Engine / Structure | Unity BepinEx (Custom Nexus Download) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `diplomacyisnotanoption` |
| Executable | `Diplomacy is Not an Option.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1070](https://www.nexusmods.com/site/mods/1070) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Diplomacy_Is_Not_an_Option](https://www.pcgamingwiki.com/wiki/Diplomacy_Is_Not_an_Option) |

## Supported Stores

- **Steam** — `1272320`
- **Epic Games Store** — `65b84f30926947bb87400b6e39269156`
- **GOG** — `1946916562`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `downloadCfgMan` | `false` | should BepInExConfigManager be update-checked? |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `diplomacyisnotanoption-root` | high | `{gamePath}` |
| BepInEx Configuration Manager | `diplomacyisnotanoption-bepcfgman` | high | `{gamePath}/Bepinex` |
| BepinEx Mod | `diplomacyisnotanoption-bepmods` | high | `{gamePath}/BepinEx/plugins` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `diplomacyisnotanoption-bepcfgman` | 9 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download BepInEx Configuration Manager
- Open PCGamingWiki Page
- Open SteamDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Required Extensions** — depends on: `modtype-bepinex`.
