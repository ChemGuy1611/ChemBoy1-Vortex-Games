# Alien Isolation — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Alien Isolation Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `alienisolation` |
| Executable | `AI.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/968](https://www.nexusmods.com/site/mods/968) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Alien_Isolation](https://www.pcgamingwiki.com/wiki/Alien_Isolation) |

## Supported Stores

- **Steam** — `214490`
- **Epic Games Store** — `8935bb3e1420443a9789fe01758039a5`
- **GOG** — `1744178250`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Data Files | `alienisolation-datafiles` | high | `{gamePath}/DATA` |
| Binaries / Root Game Folder | `alienisolation-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `alienisolation-datafolder` | 25 |
| `alienisolation-datafiles` | 30 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

