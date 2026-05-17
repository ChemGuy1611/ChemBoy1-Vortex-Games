# PEAK — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | PEAK Vortex Extension |
| Engine / Structure | Unity BepinEx |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `peak` |
| Executable | `PEAK.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1356](https://www.nexusmods.com/site/mods/1356) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Peak](https://www.pcgamingwiki.com/wiki/Peak) |

## Supported Stores

- **Steam** — `3527290`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `peak-root` | high | `{gamePath}` |
| BepInEx Configuration Manager | `peak-bepcfgman` | high | `{gamePath}/Bepinex` |
| BepinEx Mod | `peak-bepmods` | high | `{gamePath}/BepinEx/plugins` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `peak-bepcfgman` | 9 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download ${BEPCFGMAN_NAME}
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx Configuration Manager | 18.4.1 | — |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Required Extensions** — depends on: `modtype-bepinex`.

