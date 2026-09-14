# Mirthwood — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Mirthwood Vortex Extension |
| Engine / Structure | Unity BepinEx |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `mirthwood` |
| Executable | `Mirthwood.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1272](https://www.nexusmods.com/site/mods/1272) |

## Supported Stores

- **Steam** — `2272900`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `downloadCfgMan` | `false` | should BepInExConfigManager be downloaded? |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `mirthwood-root` | high | `{gamePath}` |
| BepInEx Configuration Manager | `mirthwood-bepcfgman` | high | `{gamePath}/Bepinex` |
| BepinEx Mod | `mirthwood-bepmods` | high | `{gamePath}/BepinEx/plugins` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `mirthwood-bepcfgman` | 9 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download BepInEx Configuration Manager
- View Changelog
- Open Downloads Folder
- Open SteamDB Page
- Submit Bug Report

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Required Extensions** — depends on: `modtype-bepinex`.
